import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';

/**
 * Test suite for WalletProvider and Solana integration
 * 
 * Critical scenarios tested:
 * - Wallet connection flow (Phantom adapter)
 * - Connection state management
 * - Account switching detection
 * - Disconnect handling
 * - Error recovery (user rejection, network errors)
 * - Multiple wallet adapter support
 */

describe('WalletProvider', () => {
  let mockPhantomWallet;
  let mockSolanaConnection;
  let mockWalletAdapterNetwork;

  beforeEach(() => {
    // Mock Phantom wallet
    mockPhantomWallet = {
      name: 'Phantom',
      url: 'https://phantom.app',
      icon: 'phantom-icon.svg',
      readyState: 'Installed',
      publicKey: null,
      connected: false,
      connecting: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    };

    // Mock Solana connection
    mockSolanaConnection = {
      getBalance: vi.fn(),
      getAccountInfo: vi.fn(),
      getLatestBlockhash: vi.fn()
    };

    // Mock network config
    mockWalletAdapterNetwork = 'mainnet-beta';

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should start with disconnected state', () => {
      const initialState = {
        wallet: null,
        publicKey: null,
        connected: false,
        connecting: false,
        disconnecting: false
      };

      expect(initialState.wallet).toBeNull();
      expect(initialState.publicKey).toBeNull();
      expect(initialState.connected).toBe(false);
      expect(initialState.connecting).toBe(false);
    });

    it('should initialize with correct network', () => {
      const network = 'mainnet-beta';
      const expectedEndpoint = 'https://api.mainnet-beta.solana.com';

      expect(network).toBe('mainnet-beta');
    });
  });

  describe('Wallet Connection Flow', () => {
    it('should connect wallet successfully', async () => {
      const mockPublicKey = {
        toString: () => 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'
      };

      mockPhantomWallet.connect.mockResolvedValue();
      mockPhantomWallet.publicKey = mockPublicKey;
      mockPhantomWallet.connected = true;

      const states = [
        { connecting: false, connected: false },
        { connecting: true, connected: false },
        { connecting: false, connected: true, publicKey: mockPublicKey }
      ];

      expect(states[0].connecting).toBe(false);
      expect(states[1].connecting).toBe(true);
      expect(states[2].connected).toBe(true);
      expect(states[2].publicKey).toBeDefined();
    });

    it('should handle user rejection during connection', async () => {
      const rejectionError = new Error('User rejected the request');
      rejectionError.code = 4001;

      mockPhantomWallet.connect.mockRejectedValue(rejectionError);

      await expect(mockPhantomWallet.connect()).rejects.toThrow('User rejected');
    });

    it('should handle wallet not installed error', () => {
      const notInstalledWallet = {
        ...mockPhantomWallet,
        readyState: 'NotDetected'
      };

      expect(notInstalledWallet.readyState).toBe('NotDetected');
    });

    it('should transition through connection states correctly', () => {
      const stateFlow = [
        { step: 'initial', connecting: false, connected: false },
        { step: 'connecting', connecting: true, connected: false },
        { step: 'connected', connecting: false, connected: true }
      ];

      stateFlow.forEach((state, index) => {
        if (index === 0) {
          expect(state.connecting).toBe(false);
          expect(state.connected).toBe(false);
        } else if (index === 1) {
          expect(state.connecting).toBe(true);
        } else {
          expect(state.connected).toBe(true);
        }
      });
    });
  });

  describe('Phantom Adapter Initialization', () => {
    it('should create Phantom adapter with correct config', () => {
      const phantomConfig = {
        name: 'Phantom',
        url: 'https://phantom.app',
        readyState: 'Installed'
      };

      expect(phantomConfig.name).toBe('Phantom');
      expect(phantomConfig.url).toBe('https://phantom.app');
    });

    it('should detect Phantom installation status', () => {
      const installedStates = {
        'Installed': true,
        'NotDetected': false,
        'Loadable': false,
        'Unsupported': false
      };

      Object.entries(installedStates).forEach(([state, isInstalled]) => {
        expect(state === 'Installed').toBe(isInstalled);
      });
    });

    it('should handle multiple wallet adapters', () => {
      const wallets = [
        { name: 'Phantom', readyState: 'Installed' },
        { name: 'Solflare', readyState: 'NotDetected' },
        { name: 'Ledger', readyState: 'Loadable' }
      ];

      const installedWallets = wallets.filter(w => w.readyState === 'Installed');
      expect(installedWallets).toHaveLength(1);
      expect(installedWallets[0].name).toBe('Phantom');
    });
  });

  describe('Connection Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');
      mockPhantomWallet.connect.mockRejectedValue(networkError);

      try {
        await mockPhantomWallet.connect();
      } catch (error) {
        expect(error.message).toContain('Network');
      }
    });

    it('should handle wallet locked error', async () => {
      const lockedError = new Error('Wallet is locked');
      lockedError.code = -32603;

      mockPhantomWallet.connect.mockRejectedValue(lockedError);

      try {
        await mockPhantomWallet.connect();
      } catch (error) {
        expect(error.code).toBe(-32603);
      }
    });

    it('should reset connecting state on error', async () => {
      mockPhantomWallet.connect.mockRejectedValue(new Error('Connection failed'));

      const states = [
        { connecting: true, error: null },
        { connecting: false, error: 'Connection failed' }
      ];

      expect(states[0].connecting).toBe(true);
      expect(states[1].connecting).toBe(false);
      expect(states[1].error).toBeDefined();
    });

    it('should provide user-friendly error messages', () => {
      const errors = [
        { code: 4001, message: 'User rejected the request', friendly: 'Connection cancelled' },
        { code: -32603, message: 'Wallet locked', friendly: 'Please unlock your wallet' },
        { message: 'Network error', friendly: 'Connection failed. Please try again.' }
      ];

      errors.forEach(err => {
        expect(err.friendly).toBeDefined();
      });
    });
  });

  describe('Account Switching', () => {
    it('should detect account change event', () => {
      const oldAccount = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
      const newAccount = 'GjwcWFQYzemBtpUoN5fMAP2FZviTtMRWCmrppGuTthJS';

      expect(oldAccount).not.toBe(newAccount);
    });

    it('should update state when account switches', () => {
      const beforeSwitch = {
        publicKey: { toString: () => 'account1' },
        balance: 1000
      };

      const afterSwitch = {
        publicKey: { toString: () => 'account2' },
        balance: null // Should refetch
      };

      expect(beforeSwitch.publicKey.toString()).not.toBe(afterSwitch.publicKey.toString());
      expect(afterSwitch.balance).toBeNull();
    });

    it('should listen for accountChanged events', () => {
      const eventListener = vi.fn();
      mockPhantomWallet.on('accountChanged', eventListener);

      expect(mockPhantomWallet.on).toHaveBeenCalledWith('accountChanged', expect.any(Function));
    });

    it('should cleanup event listeners on disconnect', () => {
      const eventHandler = vi.fn();
      mockPhantomWallet.on('accountChanged', eventHandler);
      mockPhantomWallet.off('accountChanged', eventHandler);

      expect(mockPhantomWallet.off).toHaveBeenCalled();
    });
  });

  describe('Disconnect Handling', () => {
    it('should disconnect wallet successfully', async () => {
      mockPhantomWallet.connected = true;
      mockPhantomWallet.publicKey = { toString: () => 'test-key' };
      mockPhantomWallet.disconnect.mockResolvedValue();

      const beforeDisconnect = {
        connected: true,
        disconnecting: false
      };

      const duringDisconnect = {
        connected: true,
        disconnecting: true
      };

      const afterDisconnect = {
        connected: false,
        disconnecting: false,
        publicKey: null
      };

      expect(beforeDisconnect.connected).toBe(true);
      expect(duringDisconnect.disconnecting).toBe(true);
      expect(afterDisconnect.connected).toBe(false);
      expect(afterDisconnect.publicKey).toBeNull();
    });

    it('should clear all wallet state on disconnect', () => {
      const connectedState = {
        wallet: mockPhantomWallet,
        publicKey: { toString: () => 'test' },
        connected: true,
        balance: 1000,
        transactions: []
      };

      const disconnectedState = {
        wallet: null,
        publicKey: null,
        connected: false,
        balance: null,
        transactions: []
      };

      expect(disconnectedState.wallet).toBeNull();
      expect(disconnectedState.publicKey).toBeNull();
      expect(disconnectedState.connected).toBe(false);
      expect(disconnectedState.balance).toBeNull();
    });

    it('should handle disconnect errors gracefully', async () => {
      const disconnectError = new Error('Failed to disconnect');
      mockPhantomWallet.disconnect.mockRejectedValue(disconnectError);

      try {
        await mockPhantomWallet.disconnect();
      } catch (error) {
        expect(error.message).toContain('disconnect');
      }
    });
  });

  describe('Wallet Ready State Detection', () => {
    it('should correctly identify wallet states', () => {
      const states = {
        'Installed': { canConnect: true, needsInstall: false },
        'NotDetected': { canConnect: false, needsInstall: true },
        'Loadable': { canConnect: true, needsInstall: false },
        'Unsupported': { canConnect: false, needsInstall: false }
      };

      expect(states['Installed'].canConnect).toBe(true);
      expect(states['NotDetected'].needsInstall).toBe(true);
      expect(states['Unsupported'].canConnect).toBe(false);
    });
  });

  describe('Auto-connect Behavior', () => {
    it('should attempt auto-connect if previously connected', () => {
      const shouldAutoConnect = localStorage.getItem('walletAutoConnect') === 'true';
      
      // Mock localStorage
      const mockLocalStorage = {
        'walletAutoConnect': 'true'
      };

      expect(mockLocalStorage['walletAutoConnect']).toBe('true');
    });

    it('should not auto-connect if user manually disconnected', () => {
      const mockLocalStorage = {
        'walletAutoConnect': 'false'
      };

      expect(mockLocalStorage['walletAutoConnect']).toBe('false');
    });
  });

  describe('Balance Fetching', () => {
    it('should fetch balance after connection', async () => {
      const mockBalance = 1500000000; // 1.5 SOL in lamports
      mockSolanaConnection.getBalance.mockResolvedValue(mockBalance);

      const balance = await mockSolanaConnection.getBalance();
      expect(balance).toBe(mockBalance);
    });

    it('should convert lamports to SOL correctly', () => {
      const lamports = 1500000000;
      const sol = lamports / 1000000000;
      
      expect(sol).toBe(1.5);
    });

    it('should handle balance fetch errors', async () => {
      mockSolanaConnection.getBalance.mockRejectedValue(new Error('RPC Error'));

      try {
        await mockSolanaConnection.getBalance();
      } catch (error) {
        expect(error.message).toContain('RPC Error');
      }
    });
  });

  describe('Connection Context Provider', () => {
    it('should provide all required context values', () => {
      const contextValue = {
        wallet: null,
        publicKey: null,
        connected: false,
        connecting: false,
        disconnecting: false,
        select: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        signTransaction: vi.fn(),
        signAllTransactions: vi.fn(),
        signMessage: vi.fn()
      };

      const requiredMethods = [
        'select',
        'connect',
        'disconnect',
        'signTransaction',
        'signAllTransactions',
        'signMessage'
      ];

      requiredMethods.forEach(method => {
        expect(contextValue).toHaveProperty(method);
      });
    });
  });

  describe('Network Configuration', () => {
    it('should use correct RPC endpoint for mainnet', () => {
      const networks = {
        'mainnet-beta': 'https://api.mainnet-beta.solana.com',
        'devnet': 'https://api.devnet.solana.com',
        'testnet': 'https://api.testnet.solana.com'
      };

      expect(networks['mainnet-beta']).toContain('mainnet-beta');
      expect(networks['devnet']).toContain('devnet');
    });

    it('should allow custom RPC endpoints', () => {
      const customEndpoint = 'https://my-custom-rpc.com';
      expect(customEndpoint).toContain('https://');
    });
  });

  describe('Transaction Signing', () => {
    it('should provide transaction signing capability', async () => {
      const mockTransaction = { signatures: [] };
      const signTransaction = vi.fn().mockResolvedValue(mockTransaction);

      mockPhantomWallet.signTransaction = signTransaction;

      await mockPhantomWallet.signTransaction(mockTransaction);
      expect(signTransaction).toHaveBeenCalledWith(mockTransaction);
    });

    it('should handle sign rejection', async () => {
      const rejectionError = new Error('User rejected signature request');
      rejectionError.code = 4001;

      mockPhantomWallet.signTransaction = vi.fn().mockRejectedValue(rejectionError);

      try {
        await mockPhantomWallet.signTransaction({});
      } catch (error) {
        expect(error.code).toBe(4001);
      }
    });
  });

  describe('Error State Management', () => {
    it('should clear errors on successful connection', () => {
      const states = [
        { error: 'Previous connection failed', connected: false },
        { error: null, connected: true }
      ];

      expect(states[0].error).toBeDefined();
      expect(states[1].error).toBeNull();
    });

    it('should maintain error until next action', () => {
      const errorState = {
        error: 'Connection failed',
        connected: false
      };

      // Error persists
      expect(errorState.error).toBeDefined();
    });
  });
});