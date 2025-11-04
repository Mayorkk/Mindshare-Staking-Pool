import * as anchor from "@coral-xyz/anchor";
import { 
  PublicKey, 
  Keypair, 
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { 
  createMint, 
  createAccount, 
  mintTo,
  getAccount,
  getMint,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";

// Program ID
const PROGRAM_ID = new PublicKey("CTFpHFmLKeiC7dyccTtmR1ex5HAoq2i1MwMenD4Qrsxi");

class StakingPoolInteractor {
  private connection: anchor.web3.Connection;
  private admin: Keypair;
  private user: Keypair;
  private programId: PublicKey;

  constructor(connection: anchor.web3.Connection) {
    this.connection = connection;
    this.admin = Keypair.generate();
    this.user = Keypair.generate();
    this.programId = PROGRAM_ID;
  }

  async airdrop(amount: number = 2) {
    console.log(`💰 Airdropping ${amount} SOL...`);
    
    const adminSig = await this.connection.requestAirdrop(
      this.admin.publicKey, 
      amount * anchor.web3.LAMPORTS_PER_SOL
    );
    await this.connection.confirmTransaction(adminSig);
    
    const userSig = await this.connection.requestAirdrop(
      this.user.publicKey, 
      amount * anchor.web3.LAMPORTS_PER_SOL
    );
    await this.connection.confirmTransaction(userSig);
    
    console.log("✅ Airdrop successful");
  }

  async createTestToken() {
    console.log("🪙 Creating test SPL token...");
    
    const mint = await createMint(
      this.connection,
      this.admin,
      this.admin.publicKey,
      null,
      6
    );
    
    console.log("✅ Token created:", mint.toString());
    return mint;
  }

  async createUserTokenAccount(mint: PublicKey) {
    console.log("👤 Creating user token account...");
    
    const userTokenAccount = await createAccount(
      this.connection,
      this.user,
      mint,
      this.user.publicKey
    );
    
    console.log("✅ User token account created:", userTokenAccount.toString());
    return userTokenAccount;
  }

  async mintTokens(mint: PublicKey, userTokenAccount: PublicKey, amount: number) {
    console.log(`🪙 Minting ${amount} tokens...`);
    
    await mintTo(
      this.connection,
      this.admin,
      mint,
      userTokenAccount,
      this.admin,
      amount * Math.pow(10, 6)
    );
    
    console.log("✅ Tokens minted");
  }

  derivePDAs(poolId: number) {
    const poolIdBuffer = Buffer.alloc(8);
    poolIdBuffer.writeUInt32LE(poolId, 0);
    
    const [programState] = PublicKey.findProgramAddressSync(
      [Buffer.from("program_state")],
      this.programId
    );
    
    const [pool] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), poolIdBuffer],
      this.programId
    );
    
    const [poolVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool_vault"), poolIdBuffer],
      this.programId
    );
    
    const [rewardVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_vault"), poolIdBuffer],
      this.programId
    );
    
    const [userStake] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_stake"), this.user.publicKey.toBuffer(), poolIdBuffer],
      this.programId
    );
    
    return {
      programState,
      pool,
      poolVault,
      rewardVault,
      userStake
    };
  }

  async showAccountInfo() {
    console.log("\n📊 Account Information:");
    console.log("Program ID:", this.programId.toString());
    console.log("Admin:", this.admin.publicKey.toString());
    console.log("User:", this.user.publicKey.toString());
    
    const adminBalance = await this.connection.getBalance(this.admin.publicKey);
    const userBalance = await this.connection.getBalance(this.user.publicKey);
    
    console.log("Admin SOL Balance:", adminBalance / anchor.web3.LAMPORTS_PER_SOL);
    console.log("User SOL Balance:", userBalance / anchor.web3.LAMPORTS_PER_SOL);
  }

  async showPDAs(poolId: number = 1) {
    console.log(`\n🔍 PDAs for Pool ${poolId}:`);
    const pdas = this.derivePDAs(poolId);
    
    console.log("Program State:", pdas.programState.toString());
    console.log("Pool:", pdas.pool.toString());
    console.log("Pool Vault:", pdas.poolVault.toString());
    console.log("Reward Vault:", pdas.rewardVault.toString());
    console.log("User Stake:", pdas.userStake.toString());
  }

  async showInstructions() {
    console.log("\n📋 Available Commands:");
    console.log("1. airdrop - Airdrop SOL to accounts");
    console.log("2. create-token - Create test SPL token");
    console.log("3. create-account - Create user token account");
    console.log("4. mint - Mint tokens to user");
    console.log("5. show-accounts - Show account information");
    console.log("6. show-pdas - Show PDA addresses");
    console.log("7. exit - Exit");
  }

  async run() {
    console.log("🚀 Mindshare Staking Pool Interactor");
    console.log("====================================");
    
    await this.showInstructions();
    
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
      const command = await askQuestion('\nEnter command: ');
      
      switch (command.toLowerCase()) {
        case 'airdrop':
          await this.airdrop();
          break;
        case 'create-token':
          await this.createTestToken();
          break;
        case 'create-account':
          console.log("Please create a token first");
          break;
        case 'mint':
          console.log("Please create accounts first");
          break;
        case 'show-accounts':
          await this.showAccountInfo();
          break;
        case 'show-pdas':
          await this.showPDAs();
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

// Example usage
async function main() {
  // Connect to devnet
  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );
  
  const interactor = new StakingPoolInteractor(connection);
  await interactor.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { StakingPoolInteractor };
