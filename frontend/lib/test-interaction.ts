/**
 * Example: How to interact with your deployed staking program
 * 
 * This file shows you exactly how to interact with the program
 * Copy these examples into your page.tsx or components
 */

import { AnchorProvider, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import {
  getProgram,
  initializeProgram,
  createPool,
  stake,
  claimRewards,
  unstake,
  fetchPool,
  fetchUserStake,
  fetchProgramState,
  PROGRAM_ID,
} from './program';

// ============================================================================
// 1. SETUP CONNECTION AND PROVIDER
// ============================================================================

export function setupProvider(connection: Connection, wallet: any): AnchorProvider {
  return new AnchorProvider(
    connection,
    wallet,
    {
      commitment: 'confirmed',
    }
  );
}

// ============================================================================
// 2. EXAMPLE: Initialize the Program (Admin only, first time)
// ============================================================================

export async function initializeProgramExample(provider: AnchorProvider) {
  const program = getProgram(provider);
  const wallet = provider.wallet;

  try {
    console.log('Initializing program...');
    const tx = await initializeProgram(program, wallet.publicKey);
    console.log('✅ Program initialized! Transaction:', tx);
    return tx;
  } catch (error) {
    console.error('❌ Failed to initialize program:', error);
    throw error;
  }
}

// ============================================================================
// 3. EXAMPLE: Create a Pool (Admin only)
// ============================================================================

export async function createPoolExample(provider: AnchorProvider) {
  const program = getProgram(provider);
  const wallet = provider.wallet;

  // Replace these with your actual token mint address
  const tokenMint = new PublicKey('YOUR_TOKEN_MINT_ADDRESS_HERE');

  const tx = await createPool(
    program,
    wallet.publicKey,
    1, // Pool ID (use 1, 2, 3, etc. for different pools)
    tokenMint,
    1000000, // Max stake: 1,000,000 tokens
    2592000, // Min lock: 30 days (in seconds)
    500, // Slashing rate: 5% (500/10000)
    100 // Base reward rate
  );

  console.log('✅ Pool created! Transaction:', tx);
  return tx;
}

// ============================================================================
// 4. EXAMPLE: Stake Tokens
// ============================================================================

export async function stakeExample(
  provider: AnchorProvider,
  user: PublicKey,
  poolId: number,
  amount: number,
  lockDays: number
) {
  const program = getProgram(provider);

  // Replace with your actual addresses
  const userTokenAccount = new PublicKey('YOUR_USER_TOKEN_ACCOUNT');
  const poolVault = new PublicKey('YOUR_POOL_VAULT_ADDRESS');
  const tokenMint = new PublicKey('YOUR_TOKEN_MINT_ADDRESS');

  const lockSeconds = lockDays * 86400; // Convert days to seconds

  try {
    console.log(`Staking ${amount} tokens for ${lockDays} days...`);
    const tx = await stake(
      program,
      user,
      poolId,
      amount,
      lockSeconds,
      userTokenAccount,
      poolVault,
      tokenMint
    );
    console.log('✅ Staked successfully! Transaction:', tx);
    return tx;
  } catch (error) {
    console.error('❌ Stake failed:', error);
    throw error;
  }
}

// ============================================================================
// 5. EXAMPLE: Claim Rewards
// ============================================================================

export async function claimRewardsExample(
  provider: AnchorProvider,
  user: PublicKey,
  poolId: number
) {
  const program = getProgram(provider);

  // Replace with your actual addresses
  const userTokenAccount = new PublicKey('YOUR_USER_TOKEN_ACCOUNT');
  const rewardVault = new PublicKey('YOUR_REWARD_VAULT_ADDRESS');
  const tokenMint = new PublicKey('YOUR_TOKEN_MINT_ADDRESS');

  try {
    console.log('Claiming rewards...');
    const tx = await claimRewards(
      program,
      user,
      poolId,
      userTokenAccount,
      rewardVault,
      tokenMint
    );
    console.log('✅ Rewards claimed! Transaction:', tx);
    return tx;
  } catch (error) {
    console.error('❌ Claim failed:', error);
    throw error;
  }
}

// ============================================================================
// 6. EXAMPLE: Unstake Tokens
// ============================================================================

export async function unstakeExample(
  provider: AnchorProvider,
  user: PublicKey,
  poolId: number,
  amount: number
) {
  const program = getProgram(provider);

  // Replace with your actual addresses
  const userTokenAccount = new PublicKey('YOUR_USER_TOKEN_ACCOUNT');
  const poolVault = new PublicKey('YOUR_POOL_VAULT_ADDRESS');
  const tokenMint = new PublicKey('YOUR_TOKEN_MINT_ADDRESS');

  try {
    console.log(`Unstaking ${amount} tokens...`);
    const tx = await unstake(
      program,
      user,
      poolId,
      amount,
      userTokenAccount,
      poolVault,
      tokenMint
    );
    console.log('✅ Unstaked successfully! Transaction:', tx);
    return tx;
  } catch (error) {
    console.error('❌ Unstake failed:', error);
    throw error;
  }
}

// ============================================================================
// 7. EXAMPLE: Fetch Pool Data
// ============================================================================

export async function fetchPoolExample(provider: AnchorProvider, poolId: number) {
  const program = getProgram(provider);

  try {
    const pool = await fetchPool(program, poolId);
    
    if (pool) {
      console.log('📊 Pool Data:');
      console.log('  Pool ID:', pool.poolId.toString());
      console.log('  Token Mint:', pool.tokenMint.toString());
      console.log('  Max Stake:', pool.maxStakeAmount.toString());
      console.log('  Current Staked:', pool.currentStaked.toString());
      console.log('  Min Lock Period:', pool.minLockPeriod.toString(), 'seconds');
      console.log('  Slashing Rate:', pool.slashingRate, '%');
      console.log('  Is Active:', pool.isActive);
    } else {
      console.log('Pool not found');
    }

    return pool;
  } catch (error) {
    console.error('❌ Failed to fetch pool:', error);
    throw error;
  }
}

// ============================================================================
// 8. EXAMPLE: Fetch User Stake Data
// ============================================================================

export async function fetchUserStakeExample(
  provider: AnchorProvider,
  user: PublicKey,
  poolId: number
) {
  const program = getProgram(provider);

  try {
    const userStake = await fetchUserStake(program, user, poolId);

    if (userStake) {
      console.log('👤 User Stake Data:');
      console.log('  User:', userStake.user.toString());
      console.log('  Pool ID:', userStake.poolId.toString());
      console.log('  Stake Amount:', userStake.stakeAmount.toString());
      console.log('  Lock Duration:', userStake.lockDuration.toString(), 'seconds');
      console.log('  Lock Until:', new Date(userStake.lockUntil.toNumber() * 1000));
      console.log('  Pending Rewards:', userStake.pendingRewards.toString());
      console.log('  Is Slashed:', userStake.isSlashed);
    } else {
      console.log('No stake found for this user');
    }

    return userStake;
  } catch (error) {
    console.error('❌ Failed to fetch user stake:', error);
    throw error;
  }
}

// ============================================================================
// 9. USAGE IN YOUR REACT COMPONENT
// ============================================================================

/*
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { setupProvider, stakeExample, fetchPoolExample } from '@/lib/test-interaction';

function YourComponent() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const handleStake = async () => {
    if (!publicKey) return;

    const provider = setupProvider(connection, {
      publicKey,
      signTransaction,
      signAllTransactions: async (txs) => {
        // Handle multiple transactions
        return txs.map(tx => ({ publicKey, signTransaction }));
      },
    });

    USE THE DEFAULT SIGN_TRANSACTION
    try {
      await stakeExample(provider, publicKey, 1, 1000, 30);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadPoolData = async () => {
    if (!publicKey) return;

    const provider = setupProvider(connection, {
      publicKey,
      signTransaction,
    });

    const pool = await fetchPoolExample(provider, 1);
    const userStake = await fetchUserStakeExample(provider, publicKey, 1);
  };

  return (
    <div>
      <button onClick={handleStake}>Stake 1000 tokens for 30 days</button>
      <button onClick={loadPoolData}>Load Pool Data</button>
    </div>
  );
}
*/






