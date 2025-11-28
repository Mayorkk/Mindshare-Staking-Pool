import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { 
  getAssociatedTokenAddressSync, 
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { MindshareStakingPool } from "./utils/mindshare_staking_pool"; 
import idl from "./utils/idl.json";

// --- CONFIGURATION ---
const STAKING_MINT = new PublicKey("7qesuuhfzzY3Ubq6QioE9w5XkLAbpNCihQ6i1UkiD2SK"); // Check this matches your mint
const POOL_ID = new BN(1); 

// Pool Config
const MAX_STAKE = new BN(1_000_000 * 1_000_000); 
const MIN_LOCK = new BN(0);
const SLASHING = 0; 
const REWARD_RATE = new BN(10); 

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com");
  const wallet = anchor.Wallet.local();
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);
  const program = new Program(idl as any, provider);

  console.log("🚀 Starting Admin Flow...");

  // --- STEP 1: GLOBAL STATE ---
  const [programStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("program_state")], 
    program.programId
  );

  // Check if global state exists, if not, init it
  const stateInfo = await connection.getAccountInfo(programStatePda);
  if (!stateInfo) {
    console.log("Step 1: Initializing Global State...");
    await program.methods.initialize().accounts({
      programState: programStatePda,
      payer: wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any).rpc();
    console.log("✅ Global State Initialized");
  } else {
    console.log("ℹ️ Global State exists");
  }

  // --- STEP 2: CREATE POOL ---
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), POOL_ID.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  // Check if pool exists
  const poolInfo = await connection.getAccountInfo(poolPda);
  if (!poolInfo) {
    console.log(`Step 2: Creating Pool #${POOL_ID.toString()}...`);
    await program.methods.createPool(POOL_ID, MAX_STAKE, MIN_LOCK, SLASHING, REWARD_RATE)
      .accounts({
        programState: programStatePda,
        pool: poolPda,
        admin: wallet.publicKey,
        tokenMint: STAKING_MINT,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any).rpc();
    console.log("✅ Pool Created");
  } else {
    console.log("ℹ️ Pool already created");
  }

  // --- STEP 3: CREATE & INIT VAULT ---
  
  const poolVaultAta = getAssociatedTokenAddressSync(
    STAKING_MINT,
    poolPda,
    true // allowOwnerOffCurve
  );

  console.log("Vault Address (ATA):", poolVaultAta.toString());

  // Check if ATA exists
  try {
    await getAccount(connection, poolVaultAta);
    console.log("ℹ️ Vault ATA already exists");
  } catch (error: any) {
    if (error instanceof TokenAccountNotFoundError || error.name === "TokenAccountNotFoundError") {
      console.log("Step 3a: Creating Vault ATA on-chain...");
      const tx = new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey, 
          poolVaultAta,     
          poolPda,          
          STAKING_MINT      
        )
      );
      await provider.sendAndConfirm(tx);
      console.log("✅ Vault ATA Created!");
      
      // <--- THE FIX: PAUSE HERE --->
      console.log("⏳ Waiting 5 seconds for Devnet to sync...");
      await wait(5000); 
    }
  }

  console.log("Step 3b: Linking Vault to Pool...");
  try {
    await program.methods.initPoolVault(POOL_ID)
      .accounts({
        pool: poolPda,
        admin: wallet.publicKey,
        poolVault: poolVaultAta,
        // Helper: Explicitly pass Token Program for InterfaceAccount check
        tokenProgram: TOKEN_PROGRAM_ID, 
      } as any).rpc();
    console.log("✅ Vault Linked Successfully!");
  } catch (e) {
    console.log("Note:", (e as Error).message);
  }
}

main();