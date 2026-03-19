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

      const { 
        transaction_type, 
        amount, 
        recipient_id, 
        description, 
        reference_id,
        metadata 
      } = await req.json();

      if (!transaction_type || !amount || amount <= 0) {
        return Response.json({ error: 'Invalid transaction parameters' }, { status: 400 });
      }

      // Get sender wallet with version
      const senderWallets = await base44.entities.TokenWallet.filter({ user_id: user.id });
      if (senderWallets.length === 0) {
        return Response.json({ error: 'Wallet not found' }, { status: 404 });
      }
      const senderWallet = senderWallets[0];
      const senderVersion = senderWallet.version || 0;

      // Check balance
      if (senderWallet.balance < amount) {
        return Response.json({ error: 'Insufficient balance' }, { status: 400 });
      }

      // Verify sender wallet version hasn't changed
      const senderCheck = await base44.entities.TokenWallet.filter({
        id: senderWallet.id,
        version: senderVersion
      });
      
      if (senderCheck.length === 0) {
        throw new Error('OPTIMISTIC_LOCK_FAILED');
      }

      // Deduct from sender
      await base44.entities.TokenWallet.update(senderWallet.id, {
        balance: senderWallet.balance - amount,
        version: senderVersion + 1
      });

      // Record sender transaction with audit logging
      const senderTx = await base44.entities.TokenTransaction.create({
        user_id: user.id,
        type: 'spending',
        amount: -amount,
        description: description || `${transaction_type} payment`,
        reference_id: reference_id
      });

      // Audit log
      console.log('[AUDIT] Wallet Transaction:', {
        timestamp: new Date().toISOString(),
        transaction_id: senderTx.id,
        user_id: user.id,
        type: transaction_type,
        amount: amount,
        recipient_id: recipient_id,
        reference_id: reference_id
      });

      // If there's a recipient, credit them
      if (recipient_id) {
        const recipientWallets = await base44.entities.TokenWallet.filter({ 
          user_id: recipient_id 
        });
        
        if (recipientWallets.length > 0) {
          const recipientWallet = recipientWallets[0];
          const recipientVersion = recipientWallet.version || 0;

          // Verify recipient wallet version
          const recipientCheck = await base44.entities.TokenWallet.filter({
            id: recipientWallet.id,
            version: recipientVersion
          });
          
          if (recipientCheck.length === 0) {
            throw new Error('OPTIMISTIC_LOCK_FAILED');
          }

          // Credit recipient
          await base44.entities.TokenWallet.update(recipientWallet.id, {
            balance: recipientWallet.balance + amount,
            lifetime_earnings: (recipientWallet.lifetime_earnings || 0) + amount,
            version: recipientVersion + 1
          });

          // Record recipient transaction
          await base44.entities.TokenTransaction.create({
            user_id: recipient_id,
            type: 'earning',
            amount: amount,
            description: description || `${transaction_type} received`,
            reference_id: reference_id
          });
        }
      }

      return Response.json({ 
        success: true,
        message: 'Transaction completed successfully',
        new_balance: senderWallet.balance - amount,
        metadata: metadata
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