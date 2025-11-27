import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { MindshareStakingPool } from "../target/types/mindshare_staking_pool";
import { PublicKey } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.MindshareStakingPool as Program<MindshareStakingPool>;

  console.log("Initializing Program...");
  
  // 1. Initialize Global State
  const [programStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("program_state")],
    program.programId
  );
  
  try {
      await program.methods.initialize()
      .accounts({
        programState: programStatePda,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId, // Ensure this is added
      } as any) // <--- CRITICAL FIX: Cast to any to bypass TS error
      .rpc();
      console.log("Global State Initialized!");
  } catch (e) {
      console.log("Global state likely already initialized or error:", e);
  }

  // 2. Create Pool
  const POOL_ID = new BN(1);
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), POOL_ID.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  // REPLACE WITH YOUR ACTUAL DEVNET MINT ADDRESS
  // If you don't have one, create one: spl-token create-token
  const MINT_ADDRESS = new PublicKey("YOUR_DEVNET_TOKEN_MINT_ADDRESS"); 

  console.log("Creating Pool...");
  try {
    await program.methods.createPool(
        POOL_ID,
        new BN(1000000000), 
        new BN(0),          
        0,                  
        new BN(10)          
    )
    .accounts({
        pool: poolPda,
        programState: programStatePda,
        admin: provider.wallet.publicKey,
        tokenMint: MINT_ADDRESS,
        systemProgram: anchor.web3.SystemProgram.programId,
    } as any) // <--- CRITICAL FIX: Cast to any
    .rpc();

    console.log("Pool Created at:", poolPda.toString());
  } catch (e) {
    console.error("Error creating pool:", e);
  }
}

main().then(() => console.log("Done"));