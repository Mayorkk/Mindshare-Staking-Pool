import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import IDL from '../idl/mindshare_staking_pool.json';

// Program ID from deployment
export const PROGRAM_ID = new PublicKey('CzSrtvHksDXtM9nFpwGuQ3QQVwNTEXD6jPUjkpqwMjhd');

export interface ProgramState {
  admin: PublicKey;
  totalPools: anchor.BN;
  isPaused: boolean;
  bump: number;
}

export interface StakingPool {
  poolId: anchor.BN;
  tokenMint: PublicKey;
  poolVault: PublicKey;
  rewardVault: PublicKey;
  admin: PublicKey;
  maxStakeAmount: anchor.BN;
  currentStaked: anchor.BN;
  minLockPeriod: anchor.BN;
  slashingRate: number;
  baseRewardRate: anchor.BN;
  performanceMultiplier: anchor.BN;
  createdAt: anchor.BN;
  isActive: boolean;
  bump: number;
}

export interface UserStake {
  user: PublicKey;
  poolId: anchor.BN;
  stakeAmount: anchor.BN;
  lockDuration: anchor.BN;
  stakedAt: anchor.BN;
  lockUntil: anchor.BN;
  lastClaimed: anchor.BN;
  pendingRewards: anchor.BN;
  isSlashed: boolean;
  bump: number;
}

// Initialize the Anchor program
export function getProgram(provider: AnchorProvider): Program {
  return new Program(IDL as any, provider);
}

// Helper function to get PDA seeds
export function getPoolPDA(poolId: number): [Buffer, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), Buffer.from(poolId.toString()), Buffer.from([0])],
    PROGRAM_ID
  );
}

export function getUserStakePDA(user: PublicKey, poolId: number): [Buffer, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user_stake'), user.toBuffer(), Buffer.from(poolId.toString())],
    PROGRAM_ID
  );
}

export function getProgramStatePDA(): [Buffer, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('program_state')],
    PROGRAM_ID
  );
}

// Transaction helper functions
export async function initializeProgram(
  program: Program,
  admin: PublicKey
): Promise<string> {
  const [programState, bump] = getProgramStatePDA();

  const tx = await program.methods
    .initializeProgram(admin)
    .accounts({
      programState,
      payer: admin,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export async function createPool(
  program: Program,
  admin: PublicKey,
  poolId: number,
  tokenMint: PublicKey,
  maxStakeAmount: number,
  minLockPeriod: number,
  slashingRate: number,
  baseRewardRate: number
): Promise<string> {
  const [pool, poolBump] = getPoolPDA(poolId);
  const [programState] = getProgramStatePDA();

  // Derive PDAs for the vaults
  const poolVaultSeeds = [
    Buffer.from('pool_vault'),
    Buffer.from(poolId.toString()),
    Buffer.from([poolBump])
  ];
  const [poolVault] = PublicKey.findProgramAddressSync(poolVaultSeeds, PROGRAM_ID);

  const rewardVaultSeeds = [
    Buffer.from('reward_vault'),
    Buffer.from(poolId.toString()),
    Buffer.from([poolBump])
  ];
  const [rewardVault] = PublicKey.findProgramAddressSync(rewardVaultSeeds, PROGRAM_ID);

  const tx = await program.methods
    .createPool(
      new BN(poolId),
      new BN(maxStakeAmount),
      new BN(minLockPeriod),
      slashingRate,
      new BN(baseRewardRate)
    )
    .accounts({
      programState,
      pool,
      tokenMint,
      poolVault,
      rewardVault,
      admin,
      tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export async function stake(
  program: Program,
  user: PublicKey,
  poolId: number,
  amount: number,
  lockDuration: number,
  userTokenAccount: PublicKey,
  poolVault: PublicKey,
  tokenMint: PublicKey
): Promise<string> {
  const [pool] = getPoolPDA(poolId);
  const [userStake, userStakeBump] = getUserStakePDA(user, poolId);

  const tx = await program.methods
    .stake(new BN(amount), new BN(lockDuration))
    .accounts({
      pool,
      userStake,
      user,
      userTokenAccount,
      poolVault,
      tokenMint,
      tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export async function claimRewards(
  program: Program,
  user: PublicKey,
  poolId: number,
  userTokenAccount: PublicKey,
  rewardVault: PublicKey,
  tokenMint: PublicKey
): Promise<string> {
  const [pool] = getPoolPDA(poolId);
  const [userStake] = getUserStakePDA(user, poolId);

  const tx = await program.methods
    .claimRewards()
    .accounts({
      pool,
      userStake,
      user,
      userTokenAccount,
      rewardVault,
      tokenMint,
      tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    })
    .rpc();

  return tx;
}

export async function unstake(
  program: Program,
  user: PublicKey,
  poolId: number,
  amount: number,
  userTokenAccount: PublicKey,
  poolVault: PublicKey,
  tokenMint: PublicKey
): Promise<string> {
  const [pool] = getPoolPDA(poolId);
  const [userStake] = getUserStakePDA(user, poolId);

  const tx = await program.methods
    .unstake(new BN(amount))
    .accounts({
      pool,
      userStake,
      user,
      userTokenAccount,
      poolVault,
      tokenMint,
      tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    })
    .rpc();

  return tx;
}

// Fetch data functions
export async function fetchPool(program: Program, poolId: number): Promise<StakingPool | null> {
  try {
    const [poolPDA] = getPoolPDA(poolId);
    const pool = await program.account.stakingPool.fetch(poolPDA);
    return pool as unknown as StakingPool;
  } catch (error) {
    console.error('Error fetching pool:', error);
    return null;
  }
}

export async function fetchUserStake(
  program: Program,
  user: PublicKey,
  poolId: number
): Promise<UserStake | null> {
  try {
    const [userStakePDA] = getUserStakePDA(user, poolId);
    const userStake = await program.account.userStake.fetch(userStakePDA);
    return userStake as unknown as UserStake;
  } catch (error) {
    console.error('Error fetching user stake:', error);
    return null;
  }
}

export async function fetchProgramState(program: Program): Promise<ProgramState | null> {
  try {
    const [programStatePDA] = getProgramStatePDA();
    const state = await program.account.programState.fetch(programStatePDA);
    return state as unknown as ProgramState;
  } catch (error) {
    console.error('Error fetching program state:', error);
    return null;
  }
}






