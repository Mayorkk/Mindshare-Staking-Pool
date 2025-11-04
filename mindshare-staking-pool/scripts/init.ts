import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "../target/idl/mindshare_staking_pool.json";

const provider = anchor.AnchorProvider.env();

// Program ID
const PROGRAM_ID = new PublicKey("CzSrtvHksDXtM9nFpwGuQ3QQVwNTEXD6jPUjkpqwMjhd");

async function main() {
  console.log("🚀 Initializing Mindshare Staking Pool...");
  console.log("Program ID:", PROGRAM_ID.toString());
  console.log("Provider:", provider.wallet.publicKey.toString());

  // Initialize the program
  const program = new Program(idl as any, PROGRAM_ID, provider);

  // Get the program state PDA
  const [programState, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("program_state")],
    PROGRAM_ID
  );

  console.log("\n📋 Program State PDA:", programState.toString());
  console.log("Bump:", bump);

  try {
    console.log("\n⏳ Initializing program...");
    const tx = await program.methods
      .initializeProgram(provider.wallet.publicKey)
      .accounts({
        programState: programState,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Program initialized successfully!");
    console.log("Transaction signature:", tx);
    console.log("\n🔗 View on Explorer:");
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  } catch (error) {
    console.error("❌ Error initializing program:", error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });






