#!/usr/bin/env node

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { 
  createMint, 
  createAccount, 
  mintTo, 
  getAccount, 
  getMint,
  TOKEN_PROGRAM_ID 
} from "@solana/spl-token";

// Program ID
const PROGRAM_ID = new PublicKey("CTFpHFmLKeiC7dyccTtmR1ex5HAoq2i1MwMenD4Qrsxi");

// CLI Interface for Mindshare Staking Pool
class StakingPoolCLI {
  private provider: anchor.AnchorProvider;
  private program: anchor.Program;
  private admin: Keypair;
  private user: Keypair;

  constructor() {
    // Set up provider
    this.provider = anchor.AnchorProvider.env();
    anchor.setProvider(this.provider);
    
    // Load program (we'll create a mock for now since IDL generation failed)
    this.program = new anchor.Program({} as any, this.provider);
    
    // Generate keypairs
    this.admin = Keypair.generate();
    this.user = Keypair.generate();
    
    console.log("🔧 Mindshare Staking Pool CLI");
    console.log("Program ID:", PROGRAM_ID.toString());
    console.log("Admin:", this.admin.publicKey.toString());
    console.log("User:", this.user.publicKey.toString());
  }

  async airdrop() {
    console.log("\n💰 Airdropping SOL...");
    
    try {
      const adminSig = await this.provider.connection.requestAirdrop(
        this.admin.publicKey, 
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await this.provider.connection.confirmTransaction(adminSig);
      
      const userSig = await this.provider.connection.requestAirdrop(
        this.user.publicKey, 
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await this.provider.connection.confirmTransaction(userSig);
      
      console.log("✅ Airdrop successful");
    } catch (error) {
      console.error("❌ Airdrop failed:", error);
    }
  }

  async createToken() {
    console.log("\n🪙 Creating test token...");
    
    try {
      const mint = await createMint(
        this.provider.connection,
        this.admin,
        this.admin.publicKey,
        null,
        6 // 6 decimals
      );
      
      console.log("✅ Token created:", mint.toString());
      return mint;
    } catch (error) {
      console.error("❌ Token creation failed:", error);
      return null;
    }
  }

  async createUserTokenAccount(mint: PublicKey) {
    console.log("\n👤 Creating user token account...");
    
    try {
      const userTokenAccount = await createAccount(
        this.provider.connection,
        this.user,
        mint,
        this.user.publicKey
      );
      
      console.log("✅ User token account created:", userTokenAccount.toString());
      return userTokenAccount;
    } catch (error) {
      console.error("❌ User token account creation failed:", error);
      return null;
    }
  }

  async mintTokens(mint: PublicKey, userTokenAccount: PublicKey, amount: number) {
    console.log(`\n🪙 Minting ${amount} tokens to user...`);
    
    try {
      const signature = await mintTo(
        this.provider.connection,
        this.admin,
        mint,
        userTokenAccount,
        this.admin,
        amount * Math.pow(10, 6) // Convert to token units
      );
      
      console.log("✅ Tokens minted:", signature);
    } catch (error) {
      console.error("❌ Token minting failed:", error);
    }
  }

  derivePDAs(poolId: number) {
    console.log("\n🔍 Deriving PDAs...");
    
    const [programState] = PublicKey.findProgramAddressSync(
      [Buffer.from("program_state")],
      PROGRAM_ID
    );
    
    const poolIdBuffer = Buffer.alloc(8);
    poolIdBuffer.writeUInt32LE(poolId, 0);
    
    const [pool] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), poolIdBuffer],
      PROGRAM_ID
    );
    
    const [poolVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_vault"), poolIdBuffer],
      PROGRAM_ID
    );
    
    const [rewardVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_vault"), poolIdBuffer],
      PROGRAM_ID
    );
    
    const [userStake] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_stake"), this.user.publicKey.toBuffer(), poolIdBuffer],
      PROGRAM_ID
    );
    
    console.log("Program State:", programState.toString());
    console.log("Pool:", pool.toString());
    console.log("Pool Vault:", poolVault.toString());
    console.log("Reward Vault:", rewardVault.toString());
    console.log("User Stake:", userStake.toString());
    
    return {
      programState,
      pool,
      poolVault,
      rewardVault,
      userStake
    };
  }

  async showInstructions() {
    console.log("\n📋 Available Commands:");
    console.log("1. airdrop - Airdrop SOL to admin and user");
    console.log("2. create-token - Create a test SPL token");
    console.log("3. create-account - Create user token account");
    console.log("4. mint - Mint tokens to user");
    console.log("5. derive-pdas - Derive all PDAs for pool ID 1");
    console.log("6. show-accounts - Show all account addresses");
    console.log("7. exit - Exit CLI");
  }

  async run() {
    console.log("🚀 Starting Mindshare Staking Pool CLI...");
    
    // Show initial state
    await this.showInstructions();
    
    // Interactive mode
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const askQuestion = (question: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(question, resolve);
      });
    };
    
    while (true) {
      const command = await askQuestion('\nEnter command (or "help"): ');
      
      switch (command.toLowerCase()) {
        case 'airdrop':
          await this.airdrop();
          break;
        case 'create-token':
          await this.createToken();
          break;
        case 'create-account':
          console.log("Please create a token first with 'create-token'");
          break;
        case 'mint':
          console.log("Please create accounts first");
          break;
        case 'derive-pdas':
          this.derivePDAs(1);
          break;
        case 'show-accounts':
          console.log("\n📊 Account Information:");
          console.log("Program ID:", PROGRAM_ID.toString());
          console.log("Admin:", this.admin.publicKey.toString());
          console.log("User:", this.user.publicKey.toString());
          break;
        case 'help':
          await this.showInstructions();
          break;
        case 'exit':
          console.log("👋 Goodbye!");
          rl.close();
          return;
        default:
          console.log("❌ Unknown command. Type 'help' for available commands.");
      }
    }
  }
}

// Run the CLI
const cli = new StakingPoolCLI();
cli.run().catch(console.error);
