import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const PLATFORM_WALLET_ID = Deno.env.get('PLATFORM_WALLET_ID') || 'platform_system_account';
const VALID_TOKEN_CONTRACT = 'ATF7deyT7FdS7GHip1Btv8t6Mj9vhsfzffoMZhE2vvwR'; // Ascendra Social token
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 engagement rewards per minute per user

// In-memory rate limiting store (consider Redis for production multi-instance deployments)
const rateLimitStore = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const userKey = `engagement:${userId}`;
  const userLimit = rateLimitStore.get(userKey) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  
  // Reset if window expired
  if (now > userLimit.resetAt) {
    userLimit.count = 0;
    userLimit.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  
  // Check if limit exceeded
  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    const waitSeconds = Math.ceil((userLimit.resetAt - now) / 1000);
    return { allowed: false, waitSeconds };
  }
  
  // Increment count
  userLimit.count++;
  rateLimitStore.set(userKey, userLimit);
  
  return { allowed: true };
}

Deno.serve(async (req) => {
  const MAX_RETRIES = 3;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();

      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Server-side rate limiting
      const rateLimitCheck = checkRateLimit(user.id);
      if (!rateLimitCheck.allowed) {
        console.log('[SECURITY] Rate limit exceeded:', {
          timestamp: new Date().toISOString(),
          user_id: user.id,
          wait_seconds: rateLimitCheck.waitSeconds
        });
        return Response.json({ 
          error: 'Rate limit exceeded. Too many requests.',
          retry_after_seconds: rateLimitCheck.waitSeconds
        }, { 
          status: 429,
          headers: { 'Retry-After': rateLimitCheck.waitSeconds.toString() }
        });
      }

      const body = await req.json();
      const { contract_id, engagement_type, content_id } = body;

      // Comprehensive input validation
      if (!contract_id || typeof contract_id !== 'string' || contract_id.trim() === '') {
        return Response.json({ error: 'Invalid contract_id: must be a non-empty string' }, { status: 400 });
      }

      if (!content_id || typeof content_id !== 'string' || content_id.trim() === '') {
        return Response.json({ error: 'Invalid content_id: must be a non-empty string' }, { status: 400 });
      }

      const validEngagementTypes = ['like', 'share', 'comment', 'follow'];
      if (!engagement_type || !validEngagementTypes.includes(engagement_type)) {
        return Response.json({ 
          error: `Invalid engagement_type: must be one of ${validEngagementTypes.join(', ')}` 
        }, { status: 400 });
      }

      // Get contract
      const contracts = await base44.entities.SmartContract.filter({ id: contract_id });
      if (contracts.length === 0) {
        return Response.json({ error: 'Contract not found' }, { status: 404 });
      }
      const contract = contracts[0];

      if (contract.status !== 'active') {
        return Response.json({ error: 'Contract not active' }, { status: 400 });
      }

      // Check if already rewarded
      const existingPayouts = await base44.entities.SmartContractPayout.filter({
        contract_id: contract_id,
        user_id: user.id,
        content_id: content_id,
        engagement_type: engagement_type
      });

      if (existingPayouts.length > 0) {
        return Response.json({ error: 'Already rewarded for this engagement' }, { status: 400 });
      }

      // Calculate reward amount
      const requirements = contract.engagement_requirements || {};
      let rewardAmount = 0;

      if (engagement_type === 'like' && requirements.like_required) {
        rewardAmount = requirements.like_reward || 0;
      } else if (engagement_type === 'share' && requirements.share_required) {
        rewardAmount = requirements.share_reward || 0;
      } else if (engagement_type === 'comment' && requirements.comment_required) {
        rewardAmount = requirements.comment_reward || 0;
      } else if (engagement_type === 'follow' && requirements.follow_required) {
        rewardAmount = requirements.follow_reward || 0;
      } else {
        return Response.json({ error: 'Invalid engagement type' }, { status: 400 });
      }

      if (rewardAmount <= 0) {
        return Response.json({ error: 'No reward configured' }, { status: 400 });
      }

      // Check contract budget
      const remaining = contract.total_budget - (contract.spent_amount || 0);
      if (remaining < rewardAmount) {
        return Response.json({ error: 'Insufficient contract budget' }, { status: 400 });
      }

      // Check security features
      const security = contract.security_features || {};
      
      if (security.cooldown_period) {
        const cooldownMs = security.cooldown_period * 60 * 60 * 1000;
        const recentPayouts = await base44.entities.SmartContractPayout.filter({
          contract_id: contract_id,
          user_id: user.id
        });
        
        const lastPayout = recentPayouts
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
        
        if (lastPayout) {
          const timeSince = Date.now() - new Date(lastPayout.created_date).getTime();
          if (timeSince < cooldownMs) {
            return Response.json({ 
              error: 'Cooldown period not elapsed',
              retry_after: Math.ceil((cooldownMs - timeSince) / 1000 / 60) + ' minutes'
            }, { status: 429 });
          }
        }
      }

      if (security.max_payout_per_user) {
        const userPayouts = await base44.entities.SmartContractPayout.filter({
          contract_id: contract_id,
          user_id: user.id
        });
        const totalPaid = userPayouts.reduce((sum, p) => sum + p.amount_paid, 0);
        
        if (totalPaid + rewardAmount > security.max_payout_per_user) {
          return Response.json({ error: 'Max payout per user exceeded' }, { status: 400 });
        }
      }

      // Calculate 1% platform fee using integer arithmetic to avoid rounding errors
      const amountInCents = Math.round(rewardAmount * 100);
      const feeInCents = Math.floor(amountInCents * 1 / 100); // 1% fee
      const netInCents = amountInCents - feeInCents;
      
      const feeAmount = feeInCents / 100;
      const netReward = netInCents / 100;
      const grossAmount = rewardAmount;

      // Batch fetch wallets to reduce N+1 queries
      const [userWallets, platformWallets] = await Promise.all([
        base44.entities.TokenWallet.filter({ 
          user_id: user.id,
          token_contract_address: VALID_TOKEN_CONTRACT
        }),
        base44.asServiceRole.entities.TokenWallet.filter({ 
          user_id: PLATFORM_WALLET_ID,
          token_contract_address: VALID_TOKEN_CONTRACT
        })
      ]);

      let userWallet = userWallets[0];
      let userVersion = 0;
      
      if (!userWallet) {
        userWallet = await base44.entities.TokenWallet.create({
          user_id: user.id,
          token_contract_address: VALID_TOKEN_CONTRACT,
          balance: 0,
          version: 0
        });
      } else {
        userVersion = userWallet.version || 0;
      }

      let platformWallet = platformWallets[0];
      let platformVersion = 0;
      
      if (!platformWallet) {
        platformWallet = await base44.asServiceRole.entities.TokenWallet.create({
          user_id: PLATFORM_WALLET_ID,
          token_contract_address: VALID_TOKEN_CONTRACT,
          balance: 0,
          version: 0
        });
      } else {
        platformVersion = platformWallet.version || 0;
      }

      // Atomic updates with version checking
      const userUpdate = await base44.entities.TokenWallet.filter({
        id: userWallet.id,
        version: userVersion
      });
      
      if (userUpdate.length === 0) {
        throw new Error('OPTIMISTIC_LOCK_FAILED');
      }

      await base44.entities.TokenWallet.update(userWallet.id, {
        balance: userWallet.balance + netReward,
        lifetime_earnings: (userWallet.lifetime_earnings || 0) + netReward,
        version: userVersion + 1
      });

      // Platform fee
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

      // Audit log
      console.log('[AUDIT] Engagement Reward:', {
        timestamp: new Date().toISOString(),
        user_id: user.id,
        contract_id: smartContract.id,
        engagement_type: engagement_type,
        gross_amount: grossAmount,
        fee_amount: feeAmount,
        net_reward: netReward
      });

      // Create transaction with gross and fee tracking
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        type: 'earning',
        amount: netReward,
        gross_amount: grossAmount,
        fee_amount: feeAmount,
        description: `${engagement_type} reward from ${contract.contract_name}`
      });

      await base44.asServiceRole.entities.TokenTransaction.create({
        user_id: PLATFORM_WALLET_ID,
        type: 'earning',
        amount: feeAmount,
        gross_amount: grossAmount,
        fee_amount: feeAmount,
        description: `Platform fee (1%): Engagement reward`
      });

      // Create payout record
      await base44.entities.SmartContractPayout.create({
        contract_id: contract_id,
        user_id: user.id,
        user_name: user.full_name,
        engagement_type: engagement_type,
        amount_paid: rewardAmount,
        content_id: content_id,
        verification_data: `${engagement_type} on ${content_id}`,
        status: 'completed'
      });

      // Update contract stats
      await base44.entities.SmartContract.update(contract_id, {
        spent_amount: (contract.spent_amount || 0) + rewardAmount,
        total_participants: (contract.total_participants || 0) + 1,
        total_payouts: (contract.total_payouts || 0) + 1
      });

      return Response.json({ 
        success: true, 
        amount: rewardAmount,
        message: 'Reward processed successfully' 
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