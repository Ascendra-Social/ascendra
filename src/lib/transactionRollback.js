/**
 * Transaction Rollback Utility
 * 
 * Provides helper functions for implementing transaction rollback
 * in critical financial operations to prevent token loss on failures.
 * 
 * Usage:
 * import { createRollbackHandler } from '@/lib/transactionRollback';
 * 
 * const rollback = createRollbackHandler();
 * rollback.addStep('deductBudget', async () => { ... });
 * rollback.addStep('createRecord', async () => { ... });
 * 
 * try {
 *   await rollback.execute();
 * } catch (error) {
 *   await rollback.rollback(); // Automatically reverses all completed steps
 * }
 */

export class TransactionRollbackHandler {
  constructor() {
    this.steps = [];
    this.completedSteps = [];
    this.rollbackFunctions = new Map();
  }

  /**
   * Add a step to the transaction with its rollback function
   * @param {string} name - Step identifier
   * @param {Function} executeFn - Function to execute
   * @param {Function} rollbackFn - Function to rollback (optional)
   */
  addStep(name, executeFn, rollbackFn = null) {
    this.steps.push({ name, executeFn });
    if (rollbackFn) {
      this.rollbackFunctions.set(name, rollbackFn);
    }
  }

  /**
   * Execute all steps in order
   */
  async execute() {
    for (const step of this.steps) {
      try {
        const result = await step.executeFn();
        this.completedSteps.push({ name: step.name, result });
      } catch (error) {
        // Step failed - trigger rollback
        console.error(`Step '${step.name}' failed:`, error);
        await this.rollback();
        throw error;
      }
    }
    return this.completedSteps;
  }

  /**
   * Rollback all completed steps in reverse order
   */
  async rollback() {
    console.log('Starting rollback of', this.completedSteps.length, 'completed steps');
    
    const errors = [];
    
    // Rollback in reverse order
    for (let i = this.completedSteps.length - 1; i >= 0; i--) {
      const step = this.completedSteps[i];
      const rollbackFn = this.rollbackFunctions.get(step.name);
      
      if (rollbackFn) {
        try {
          console.log(`Rolling back step: ${step.name}`);
          await rollbackFn(step.result);
        } catch (rollbackError) {
          console.error(`Rollback failed for step '${step.name}':`, rollbackError);
          errors.push({ step: step.name, error: rollbackError });
        }
      } else {
        console.warn(`No rollback function defined for step: ${step.name}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Rollback completed with ${errors.length} errors: ${JSON.stringify(errors)}`);
    }

    console.log('Rollback completed successfully');
  }

  /**
   * Get results of completed steps
   */
  getResults() {
    return this.completedSteps.reduce((acc, step) => {
      acc[step.name] = step.result;
      return acc;
    }, {});
  }
}

/**
 * Create a new rollback handler instance
 */
export function createRollbackHandler() {
  return new TransactionRollbackHandler();
}

/**
 * Helper: Create wallet deduction with automatic rollback
 */
export async function deductWalletWithRollback(base44, userId, amount, description) {
  const wallets = await base44.asServiceRole.entities.TokenWallet.filter({ user_id: userId });
  const wallet = wallets.reduce((max, w) => w.balance > max.balance ? w : max);

  if (wallet.balance < amount) {
    throw new Error(`Insufficient balance. Required: ${amount}, Available: ${wallet.balance}`);
  }

  const originalBalance = wallet.balance;
  const newBalance = wallet.balance - amount;

  await base44.asServiceRole.entities.TokenWallet.update(wallet.id, {
    balance: newBalance,
    version: wallet.version + 1
  });

  // Return rollback function
  return {
    walletId: wallet.id,
    originalBalance,
    rollback: async () => {
      console.log(`Rolling back wallet deduction: restoring ${amount} tokens`);
      await base44.asServiceRole.entities.TokenWallet.update(wallet.id, {
        balance: originalBalance,
        version: wallet.version + 2 // Increment again for rollback
      });
    }
  };
}

/**
 * Helper: Create transaction record with automatic deletion rollback
 */
export async function createTransactionWithRollback(base44, transactionData) {
  const transaction = await base44.asServiceRole.entities.TokenTransaction.create(transactionData);

  return {
    transaction,
    rollback: async () => {
      console.log(`Rolling back transaction creation: deleting ${transaction.id}`);
      await base44.asServiceRole.entities.TokenTransaction.delete(transaction.id);
    }
  };
}

/**
 * Example usage in a backend function:
 * 
 * const rollback = createRollbackHandler();
 * 
 * // Step 1: Deduct buyer wallet
 * rollback.addStep('deductBuyer', async () => {
 *   const result = await deductWalletWithRollback(base44, buyerId, amount, 'Purchase');
 *   return result;
 * }, async (result) => {
 *   await result.rollback();
 * });
 * 
 * // Step 2: Create purchase record
 * rollback.addStep('createPurchase', async () => {
 *   const result = await createTransactionWithRollback(base44, { ... });
 *   return result;
 * }, async (result) => {
 *   await result.rollback();
 * });
 * 
 * // Step 3: Credit seller
 * rollback.addStep('creditSeller', async () => {
 *   // ... implementation
 * }, async () => {
 *   // ... rollback implementation
 * });
 * 
 * try {
 *   await rollback.execute();
 *   return Response.json({ success: true });
 * } catch (error) {
 *   // Rollback already happened automatically
 *   return Response.json({ error: error.message }, { status: 500 });
 * }
 */