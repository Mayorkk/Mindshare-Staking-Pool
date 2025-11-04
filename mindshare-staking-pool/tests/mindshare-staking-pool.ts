import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MindshareStakingPool } from "../target/types/mindshare_staking_pool";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { 
  createMint, 
  createAccount, 
  mintTo, 
  getAccount, 
  getMint,
  TOKEN_PROGRAM_ID 
} from "@solana/spl-token";

describe("mindshare-staking-pool", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.MindshareStakingPool as Program<MindshareStakingPool>;
  const provider = anchor.getProvider();

  // Test accounts
  const admin = Keypair.generate();
  const user = Keypair.generate();
  const poolId = new anchor.BN(1);
  
  let tokenMint: PublicKey;
  let userTokenAccount: PublicKey;
  let programState: PublicKey;
  let pool: PublicKey;
  let poolVault: PublicKey;
  let rewardVault: PublicKey;
  let userStake: PublicKey;

  before(async () => {
    // Airdrop SOL to admin and user
    await provider.connection.requestAirdrop(admin.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(user.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    
    // Wait for airdrop confirmation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a test token mint
    tokenMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6 // 6 decimals
    );
    
    // Create user token account
    userTokenAccount = await createAccount(
      provider.connection,
      user,
      tokenMint,
      user.publicKey
    );
    
    // Mint tokens to user
    await mintTo(
      provider.connection,
      admin,
      tokenMint,
      userTokenAccount,
      admin,
      1000000 // 1M tokens
    );
    
    // Derive PDAs
    [programState] = PublicKey.findProgramAddressSync(
      [Buffer.from("program_state")],
      program.programId
    );
    
    [pool] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), poolId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    
    [poolVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_vault"), poolId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    
    [rewardVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_vault"), poolId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    
    [userStake] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_stake"), user.publicKey.toBuffer(), poolId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
  });

  it("Initialize program", async () => {
    const tx = await program.methods
      .initializeProgram(admin.publicKey)
      .accounts({
        programState,
        payer: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    console.log("Program initialized:", tx);

    // Verify program state
    const state = await program.account.programState.fetch(programState);
    console.log("Program state:", {
      admin: state.admin.toString(),
      totalPools: state.totalPools.toString(),
      isPaused: state.isPaused,
    });
  });

  it("Create staking pool", async () => {
    const tx = await program.methods
      .createPool(
        poolId,
        new anchor.BN(1000000), // max stake: 1M tokens
        new anchor.BN(7 * 24 * 60 * 60), // min lock: 7 days
        1000, // slashing rate: 10%
        new anchor.BN(1000) // base reward rate
      )
      .accounts({
        programState,
        pool,
        tokenMint,
        poolVault,
        rewardVault,
        admin: admin.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    console.log("Pool created:", tx);

    // Verify pool state
    const poolData = await program.account.stakingPool.fetch(pool);
    console.log("Pool data:", {
      poolId: poolData.poolId.toString(),
      tokenMint: poolData.tokenMint.toString(),
      maxStakeAmount: poolData.maxStakeAmount.toString(),
      currentStaked: poolData.currentStaked.toString(),
      minLockPeriod: poolData.minLockPeriod.toString(),
    });
  });

  it("Stake tokens", async () => {
    const stakeAmount = new anchor.BN(100000); // 100k tokens
    const lockDuration = new anchor.BN(60 * 24 * 60 * 60); // 60 days
    
    const tx = await program.methods
      .stake(stakeAmount, lockDuration)
      .accounts({
        pool,
        userStake,
        user: user.publicKey,
        userTokenAccount,
        poolVault,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    console.log("Stake transaction:", tx);

    // Verify user stake
    const stakeData = await program.account.userStake.fetch(userStake);
    console.log("User stake:", {
      user: stakeData.user.toString(),
      poolId: stakeData.poolId.toString(),
      stakeAmount: stakeData.stakeAmount.toString(),
      lockDuration: stakeData.lockDuration.toString(),
    });
  });

  it("Claim rewards", async () => {
    const tx = await program.methods
      .claimRewards()
      .accounts({
        pool,
        userStake,
        user: user.publicKey,
        userTokenAccount,
        rewardVault,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    console.log("Claim rewards transaction:", tx);
  });

  it("Unstake tokens", async () => {
    const unstakeAmount = new anchor.BN(50000); // 50k tokens
    
    const tx = await program.methods
      .unstake(unstakeAmount)
      .accounts({
        pool,
        userStake,
        user: user.publicKey,
        userTokenAccount,
        poolVault,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();

    console.log("Unstake transaction:", tx);

    // Verify updated stake
    const stakeData = await program.account.userStake.fetch(userStake);
    console.log("Updated user stake:", {
      stakeAmount: stakeData.stakeAmount.toString(),
    });
  });
});