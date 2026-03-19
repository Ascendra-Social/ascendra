import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRollbackHandler, deductWalletWithRollback, createTransactionWithRollback } from '../../lib/transactionRollback';

/**
 * Integration test suite for transaction rollback system
 * 
 * Tests the complete rollback mechanism to ensure:
 * - All steps execute in order
 * - Failures trigger automatic rollback
 * - Rollback restores previous state
 * - No partial state remains after rollback
 */

describe('Transaction Rollback Integration', () => {
  let mockBase44;

  beforeEach(() => {
    mockBase44 = {
      asServiceRole: {
        entities: {
          TokenWallet: {
            filter: vi.fn(),
            update: vi.fn()
          },
          TokenTransaction: {
            create: vi.fn(),
            delete: vi.fn()
          }
        }
      }
    };

    vi.clearAllMocks();
  });

  describe('Rollback Handler Execution', () => {
    it('should execute all steps successfully', async () => {
      const rollback = createRollbackHandler();

      let step1Executed = false;
      let step2Executed = false;

      rollback.addStep('step1', async () => {
        step1Executed = true;
        return { data: 'step1' };
      });

      rollback.addStep('step2', async () => {
        step2Executed = true;
        return { data: 'step2' };
      });

      await rollback.execute();

      expect(step1Executed).toBe(true);
      expect(step2Executed).toBe(true);
    });

    it('should rollback on failure', async () => {
      const rollback = createRollbackHandler();

      let step1Executed = false;
      let step1RolledBack = false;

      rollback.addStep('step1', async () => {
        step1Executed = true;
        return { data: 'step1' };
      }, async () => {
        step1RolledBack = true;
      });

      rollback.addStep('step2', async () => {
        throw new Error('Step 2 failed');
      });

      try {
        await rollback.execute();
      } catch (error) {
        expect(error.message).toContain('Step 2 failed');
      }

      expect(step1Executed).toBe(true);
      expect(step1RolledBack).toBe(true);
    });

    it('should rollback steps in reverse order', async () => {
      const rollback = createRollbackHandler();
      const rollbackOrder = [];

      rollback.addStep('step1', async () => ({ data: 1 }), async () => {
        rollbackOrder.push('step1');
      });

      rollback.addStep('step2', async () => ({ data: 2 }), async () => {
        rollbackOrder.push('step2');
      });

      rollback.addStep('step3', async () => {
        throw new Error('Failed');
      });

      try {
        await rollback.execute();
      } catch (error) {
        // Expected
      }

      expect(rollbackOrder).toEqual(['step2', 'step1']);
    });
  });

  describe('Wallet Deduction with Rollback', () => {
    it('should deduct wallet and provide rollback', async () => {
      const mockWallet = {
        id: 'wallet-123',
        user_id: 'user-456',
        balance: 1000,
        version: 0
      };

      mockBase44.asServiceRole.entities.TokenWallet.filter.mockResolvedValue([mockWallet]);
      mockBase44.asServiceRole.entities.TokenWallet.update.mockResolvedValue({});

      const result = await deductWalletWithRollback(mockBase44, 'user-456', 100, 'Test');

      expect(mockBase44.asServiceRole.entities.TokenWallet.update).toHaveBeenCalledWith(
        'wallet-123',
        expect.objectContaining({
          balance: 900,
          version: 1
        })
      );

      expect(result.rollback).toBeDefined();
    });

    it('should rollback wallet deduction', async () => {
      const mockWallet = {
        id: 'wallet-123',
        balance: 1000,
        version: 0
      };

      mockBase44.asServiceRole.entities.TokenWallet.filter.mockResolvedValue([mockWallet]);
      mockBase44.asServiceRole.entities.TokenWallet.update.mockResolvedValue({});

      const result = await deductWalletWithRollback(mockBase44, 'user-456', 100, 'Test');
      await result.rollback();

      expect(mockBase44.asServiceRole.entities.TokenWallet.update).toHaveBeenCalledWith(
        'wallet-123',
        expect.objectContaining({
          balance: 1000, // Restored
          version: 2
        })
      );
    });

    it('should throw on insufficient balance', async () => {
      const mockWallet = {
        balance: 50
      };

      mockBase44.asServiceRole.entities.TokenWallet.filter.mockResolvedValue([mockWallet]);

      await expect(
        deductWalletWithRollback(mockBase44, 'user-456', 100, 'Test')
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('Transaction Record with Rollback', () => {
    it('should create transaction and provide rollback', async () => {
      const mockTransaction = {
        id: 'tx-123',
        amount: 100
      };

      mockBase44.asServiceRole.entities.TokenTransaction.create.mockResolvedValue(mockTransaction);
      mockBase44.asServiceRole.entities.TokenTransaction.delete.mockResolvedValue({});

      const result = await createTransactionWithRollback(mockBase44, {
        amount: 100,
        type: 'spending'
      });

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.rollback).toBeDefined();
    });

    it('should rollback transaction creation by deleting', async () => {
      const mockTransaction = {
        id: 'tx-123'
      };

      mockBase44.asServiceRole.entities.TokenTransaction.create.mockResolvedValue(mockTransaction);
      mockBase44.asServiceRole.entities.TokenTransaction.delete.mockResolvedValue({});

      const result = await createTransactionWithRollback(mockBase44, {});
      await result.rollback();

      expect(mockBase44.asServiceRole.entities.TokenTransaction.delete).toHaveBeenCalledWith('tx-123');
    });
  });

  describe('Complete Purchase Flow with Rollback', () => {
    it('should complete purchase successfully', async () => {
      const rollback = createRollbackHandler();

      mockBase44.asServiceRole.entities.TokenWallet.filter.mockResolvedValue([
        { id: 'wallet-buyer', balance: 1000, version: 0 }
      ]);
      mockBase44.asServiceRole.entities.TokenWallet.update.mockResolvedValue({});
      mockBase44.asServiceRole.entities.TokenTransaction.create.mockResolvedValue({
        id: 'tx-123'
      });

      rollback.addStep('deductBuyer', async () => {
        return await deductWalletWithRollback(mockBase44, 'buyer-id', 100, 'Purchase');
      }, async (result) => {
        await result.rollback();
      });

      rollback.addStep('createTransaction', async () => {
        return await createTransactionWithRollback(mockBase44, {
          amount: 100,
          type: 'purchase'
        });
      }, async (result) => {
        await result.rollback();
      });

      const results = await rollback.execute();
      expect(results).toHaveLength(2);
    });

    it('should rollback on purchase failure', async () => {
      const rollback = createRollbackHandler();

      mockBase44.asServiceRole.entities.TokenWallet.filter.mockResolvedValue([
        { id: 'wallet-buyer', balance: 1000, version: 0 }
      ]);
      mockBase44.asServiceRole.entities.TokenWallet.update.mockResolvedValue({});

      rollback.addStep('deductBuyer', async () => {
        return await deductWalletWithRollback(mockBase44, 'buyer-id', 100, 'Purchase');
      }, async (result) => {
        await result.rollback();
      });

      rollback.addStep('failingStep', async () => {
        throw new Error('Purchase processing failed');
      });

      try {
        await rollback.execute();
      } catch (error) {
        expect(error.message).toContain('Purchase processing failed');
      }

      // Wallet should be restored
      expect(mockBase44.asServiceRole.entities.TokenWallet.update).toHaveBeenCalledWith(
        'wallet-buyer',
        expect.objectContaining({
          balance: 1000 // Restored to original
        })
      );
    });
  });
});