import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const MAX_RETRIES = 3;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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

      // Get buyer wallet with version
      const wallets = await base44.entities.TokenWallet.filter({ user_id: user.id });
      if (wallets.length === 0 || wallets[0].balance < post.access_price) {
        return Response.json({ error: 'Insufficient balance' }, { status: 400 });
      }
      const buyerWallet = wallets[0];
      const buyerVersion = buyerWallet.version || 0;

      // Process 1% platform fee using integer arithmetic to avoid rounding errors
      // Convert to cents/smallest unit: multiply by 100, calculate fee, then divide back
      const amountInCents = Math.round(post.access_price * 100);
      const feeInCents = Math.floor(amountInCents * 1 / 100); // 1% fee
      const netInCents = amountInCents - feeInCents;
      
      const feeAmount = feeInCents / 100;
      const netAmount = netInCents / 100;
      const grossAmount = post.access_price;

      // Get creator wallet with version
      const creatorWallets = await base44.entities.TokenWallet.filter({ 
        user_id: post.author_id 
      });
      if (creatorWallets.length === 0) {
        return Response.json({ error: 'Creator wallet not found' }, { status: 400 });
      }
      const creatorWallet = creatorWallets[0];
      const creatorVersion = creatorWallet.version || 0;

      // Get platform wallet
      const platformWallets = await base44.asServiceRole.entities.TokenWallet.filter({ 
        user_id: 'platform' 
      });
      let platformWallet = platformWallets[0];
      let platformVersion = 0;
      
      if (!platformWallet) {
        platformWallet = await base44.asServiceRole.entities.TokenWallet.create({
          user_id: 'platform',
          balance: 0,
          version: 0
        });
      } else {
        platformVersion = platformWallet.version || 0;
      }

      // Atomic updates with version checking
      // Deduct from buyer
      const buyerUpdate = await base44.entities.TokenWallet.filter({
        id: buyerWallet.id,
        version: buyerVersion
      });
      
      if (buyerUpdate.length === 0) {
        throw new Error('OPTIMISTIC_LOCK_FAILED');
      }

      await base44.entities.TokenWallet.update(buyerWallet.id, {
        balance: buyerWallet.balance - post.access_price,
        version: buyerVersion + 1
      });

      // Add to creator
      const creatorUpdate = await base44.entities.TokenWallet.filter({
        id: creatorWallet.id,
        version: creatorVersion
      });
      
      if (creatorUpdate.length === 0) {
        throw new Error('OPTIMISTIC_LOCK_FAILED');
      }

      await base44.entities.TokenWallet.update(creatorWallet.id, {
        balance: creatorWallet.balance + netAmount,
        lifetime_earnings: (creatorWallet.lifetime_earnings || 0) + netAmount,
        version: creatorVersion + 1
      });

      // Add platform fee
      const platformUpdate = await base44.asServiceRole.entities.TokenWallet.filter({
        id: platformWallet.id,
        version: platformVersion
      });
      
      if (platformUpdate.length === 0) {
        throw new Error('OPTIMISTIC_LOCK_FAILED');
      }

      await base44.asServiceRole.entities.TokenWallet.update(platformWallet.id, {
        balance: platformWallet.balance + feeAmount,
        version: platformVersion + 1
      });

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

      // Audit log
      console.log('[AUDIT] Content Purchase:', {
        timestamp: new Date().toISOString(),
        buyer_id: user.id,
        creator_id: post.author_id,
        post_id: post.id,
        gross_amount: grossAmount,
        fee_amount: feeAmount,
        net_amount: netAmount
      });

      // Create transactions with gross and fee tracking
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        type: 'spending',
        amount: -grossAmount,
        gross_amount: grossAmount,
        fee_amount: 0,
        description: `Purchased: ${post.content.slice(0, 50)}`
      });

      await base44.entities.TokenTransaction.create({
        user_id: post.author_id,
        type: 'earning',
        amount: netAmount,
        gross_amount: grossAmount,
        fee_amount: feeAmount,
        description: `Content sale: ${post.content.slice(0, 50)}`
      });

      await base44.asServiceRole.entities.TokenTransaction.create({
        user_id: 'platform',
        type: 'earning',
        amount: feeAmount,
        gross_amount: grossAmount,
        fee_amount: feeAmount,
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
      if (error.message === 'OPTIMISTIC_LOCK_FAILED' && attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
  
  return Response.json({ error: 'Transaction failed after retries' }, { status: 500 });
});