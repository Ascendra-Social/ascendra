// @base44/sdk@0.8.25 — pinned to match the latest stable backend-supported version (frontend uses 0.8.26)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLATFORM_WALLET_ID = Deno.env.get('PLATFORM_WALLET_ID') || 'platform_system_account';
const VALID_TOKEN_CONTRACT = 'ATF7deyT7FdS7GHip1Btv8t6Mj9vhsfzffoMZhE2vvwR';

// Flat rewards for standard engagement (no contract required)
const FLAT_REWARDS = {
  like: 0.1,
  comment: 0.25,
  share: 0.5,
  follow: 0.2
};

const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 20;
const rateLimitStore = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const key = `engagement:${userId}`;
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, waitSeconds: Math.ceil((record.resetAt - now) / 1000) };
  }
  record.count++;
  rateLimitStore.set(key, record);
  return { allowed: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitCheck = checkRateLimit(user.id);
    if (!rateLimitCheck.allowed) {
      return Response.json({ 
        error: 'Rate limit exceeded',
        retry_after_seconds: rateLimitCheck.waitSeconds
      }, { status: 429 });
    }

    const body = await req.json();
    const { contract_id, engagement_type, content_id } = body;

    if (!content_id || typeof content_id !== 'string') {
      return Response.json({ error: 'Invalid content_id' }, { status: 400 });
    }

    const validEngagementTypes = ['like', 'share', 'comment', 'follow'];
    if (!engagement_type || !validEngagementTypes.includes(engagement_type)) {
      return Response.json({ 
        error: `Invalid engagement_type: must be one of ${validEngagementTypes.join(', ')}` 
      }, { status: 400 });
    }

    let rewardAmount = 0;

    // Contract-based rewards (if contract_id provided)
    if (contract_id) {
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
        contract_id, user_id: user.id, content_id, engagement_type
      });
      if (existingPayouts.length > 0) {
        return Response.json({ error: 'Already rewarded for this engagement' }, { status: 400 });
      }

      const requirements = contract.engagement_requirements || {};
      if (engagement_type === 'like' && requirements.like_required) rewardAmount = requirements.like_reward || 0;
      else if (engagement_type === 'share' && requirements.share_required) rewardAmount = requirements.share_reward || 0;
      else if (engagement_type === 'comment' && requirements.comment_required) rewardAmount = requirements.comment_reward || 0;
      else if (engagement_type === 'follow' && requirements.follow_required) rewardAmount = requirements.follow_reward || 0;

      if (rewardAmount <= 0) {
        return Response.json({ error: 'No reward configured for this engagement type' }, { status: 400 });
      }

      const remaining = contract.total_budget - (contract.spent_amount || 0);
      if (remaining < rewardAmount) {
        return Response.json({ error: 'Insufficient contract budget' }, { status: 400 });
      }

      // Record payout
      await base44.entities.SmartContractPayout.create({
        contract_id, user_id: user.id, user_name: user.full_name,
        engagement_type, amount_paid: rewardAmount, content_id,
        verification_data: `${engagement_type} on ${content_id}`, status: 'completed'
      });

      await base44.entities.SmartContract.update(contract_id, {
        spent_amount: (contract.spent_amount || 0) + rewardAmount,
        total_participants: (contract.total_participants || 0) + 1,
        total_payouts: (contract.total_payouts || 0) + 1
      });
    } else {
      // Flat reward for standard engagement (no contract needed)
      rewardAmount = FLAT_REWARDS[engagement_type] || 0;

      if (rewardAmount <= 0) {
        return Response.json({ success: true, amount: 0, message: 'No reward for this engagement type' });
      }
    }

    // Create reward transaction
    await base44.entities.TokenTransaction.create({
      user_id: user.id,
      type: 'earning',
      amount: rewardAmount,
      gross_amount: rewardAmount,
      fee_amount: 0,
      description: `${engagement_type} reward`,
      status: 'completed'
    });

    // Update post tokens_earned field
    try {
      const posts = await base44.asServiceRole.entities.Post.filter({ id: content_id });
      if (posts.length > 0) {
        const post = posts[0];
        await base44.asServiceRole.entities.Post.update(content_id, {
          tokens_earned: (post.tokens_earned || 0) + rewardAmount
        });
      }
    } catch (e) {
      // Non-critical, don't fail the whole request
    }

    return Response.json({ 
      success: true, 
      amount: rewardAmount,
      message: 'Reward processed successfully' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});