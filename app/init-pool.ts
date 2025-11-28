import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { MindshareStakingPool } from "./utils/mindshare_staking_pool";
import idl from "./utils/idl.json";

// 1. CONFIGURATION
// Replace with your specific values
const STAKING_MINT = new PublicKey("7qesuuhfzzY3Ubq6QioE9w5XkLAbpNCihQ6i1UkiD2SK");
const POOL_ID = 2; // Must match what you use in your hook

async function main() {
  // Set up the provider to use your local wallet (~/.config/solana/id.json)
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(idl as any, provider);

  console.log("Initializing Pool...");

  // 2. Derive PDAs
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), new anchor.BN(POOL_ID).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [poolVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_vault"), poolPda.toBuffer()], 
    program.programId
  ); 
  // NOTE: If your Rust code uses Associated Token Account for the vault, 
  // the derivation above might need to change to getAssociatedTokenAddress.
  // Assuming standard PDA vault for now based on "pool_vault" error name.

  try {
    // 3. Call Initialize
    // Check your Rust 'initialize' struct to match these argument names exactly
    const tx = await program.methods
      .initialize(new anchor.BN(POOL_ID))
      .accounts({
        pool: poolPda,
        poolVault: poolVault, 
        tokenMint: STAKING_MINT,
        payer: provider.wallet.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .rpc();

    console.log("Pool Initialized! Transaction:", tx);
    console.log("Pool PDA:", poolPda.toString());
  } catch (error) {
    console.error("Init Failed:", error);
  }
}

main();