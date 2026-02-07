import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content_id } = await req.json();

    // Get content
    const posts = await base44.entities.Post.filter({ id: content_id });
    if (posts.length === 0) {
      return Response.json({ error: 'Content not found' }, { status: 404 });
    }
    const post = posts[0];

    if (!post.is_premium) {
      return Response.json({ error: 'Content is not premium' }, { status: 400 });
    }

    // Check if already purchased
    const existing = await base44.entities.ContentPurchase.filter({
      user_id: user.id,
      content_id: content_id
    });
    if (existing.length > 0) {
      return Response.json({ success: true, message: 'Already purchased' });
    }

    // Check balance
    const wallets = await base44.entities.TokenWallet.filter({ user_id: user.id });
    if (wallets.length === 0 || wallets[0].balance < post.access_price) {
      return Response.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Process 1% platform fee
    const feeAmount = (post.access_price * 1) / 100;
    const netAmount = post.access_price - feeAmount;

    // Deduct from buyer
    await base44.entities.TokenWallet.update(wallets[0].id, {
      balance: wallets[0].balance - post.access_price
    });

    // Add to creator (net amount after fee)
    const creatorWallets = await base44.entities.TokenWallet.filter({ 
      user_id: post.author_id 
    });
    if (creatorWallets.length > 0) {
      await base44.entities.TokenWallet.update(creatorWallets[0].id, {
        balance: creatorWallets[0].balance + netAmount
      });
    }

    // Add platform fee to platform wallet
    const platformWallets = await base44.asServiceRole.entities.TokenWallet.filter({ 
      user_id: 'platform' 
    });
    if (platformWallets.length > 0) {
      await base44.asServiceRole.entities.TokenWallet.update(platformWallets[0].id, {
        balance: platformWallets[0].balance + feeAmount
      });
    } else {
      await base44.asServiceRole.entities.TokenWallet.create({
        user_id: 'platform',
        balance: feeAmount
      });
    }

    // Create purchase record
    await base44.entities.ContentPurchase.create({
      user_id: user.id,
      content_id: content_id,
      creator_id: post.author_id,
      amount_paid: post.access_price,
      contract_id: post.smart_contract_id
    });

    // Update post stats
    await base44.entities.Post.update(post.id, {
      total_revenue: (post.total_revenue || 0) + post.access_price,
      purchase_count: (post.purchase_count || 0) + 1
    });

    // Create transactions
    await base44.entities.TokenTransaction.create({
      user_id: user.id,
      type: 'spending',
      amount: -post.access_price,
      description: `Purchased: ${post.content.slice(0, 50)}`
    });

    await base44.entities.TokenTransaction.create({
      user_id: post.author_id,
      type: 'earning',
      amount: netAmount,
      description: `Content sale: ${post.content.slice(0, 50)}`
    });

    // Platform fee transaction
    await base44.asServiceRole.entities.TokenTransaction.create({
      user_id: 'platform',
      type: 'earning',
      amount: feeAmount,
      description: `Platform fee (1%): Content purchase`
    });

    // Record payout in smart contract
    if (post.smart_contract_id) {
      await base44.entities.SmartContractPayout.create({
        contract_id: post.smart_contract_id,
        user_id: post.author_id,
        user_name: post.author_name,
        engagement_type: 'custom',
        amount_paid: post.access_price,
        content_id: post.id,
        verification_data: 'Content purchase',
        status: 'completed'
      });

      const contracts = await base44.entities.SmartContract.filter({ 
        id: post.smart_contract_id 
      });
      if (contracts.length > 0) {
        await base44.entities.SmartContract.update(post.smart_contract_id, {
          spent_amount: (contracts[0].spent_amount || 0) + post.access_price,
          total_participants: (contracts[0].total_participants || 0) + 1,
          total_payouts: (contracts[0].total_payouts || 0) + 1
        });
      }
    }

    return Response.json({ 
      success: true, 
      message: 'Content unlocked successfully' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});