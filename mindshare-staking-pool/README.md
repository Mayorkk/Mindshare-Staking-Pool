# 🚀 Mindshare Staking Pool

A Solana program for staking SPL tokens with time-locked rewards and slashing mechanisms.

## ✅ Features

- **SPL Token Staking**: Stake any SPL token (not SOL)
- **Same Token Rewards**: Rewards paid in the same staked token
- **Variable Rewards**: Based on pool performance and multipliers
- **Time-Locked Staking**: Minimum lock periods with early withdrawal penalties
- **Slashing Mechanism**: Penalties for early unstaking
- **Multiple Pools**: Support for different staking pools
- **Pool Capacity Limits**: Maximum staking amounts per pool
- **Program Derived Addresses**: Secure token vault management
- **Access Control**: Admin functions for pool management

## 🏗️ Contract Structure

### Account Types

#### ProgramState
- `admin`: Program administrator
- `total_pools`: Number of created pools
- `is_paused`: Emergency pause flag
- `bump`: PDA bump seed

#### StakingPool
- `pool_id`: Unique pool identifier
- `token_mint`: SPL token mint address
- `pool_vault`: Token vault for staked tokens
- `reward_vault`: Token vault for rewards
- `admin`: Pool administrator
- `max_stake_amount`: Maximum staking capacity
- `current_staked`: Currently staked amount
- `min_lock_period`: Minimum staking duration
- `slashing_rate`: Early withdrawal penalty rate
- `base_reward_rate`: Base reward rate
- `performance_multiplier`: Performance bonus multiplier
- `created_at`: Pool creation timestamp
- `is_active`: Pool status
- `bump`: PDA bump seed

#### UserStake
- `user`: User's public key
- `pool_id`: Associated pool ID
- `stake_amount`: Staked token amount
- `lock_duration`: Staking duration
- `staked_at`: Staking timestamp
- `lock_until`: Lock expiration timestamp
- `last_claimed`: Last reward claim timestamp
- `pending_rewards`: Unclaimed rewards
- `is_slashed`: Slashing status
- `bump`: PDA bump seed

### Functions

#### `initialize_program(admin: Pubkey)`
- Initializes the program with an admin
- Creates the program state account

#### `create_pool(pool_id, max_stake, min_lock, slashing_rate, base_rate)`
- Creates a new staking pool
- Sets up token vaults
- Configures pool parameters

#### `stake(amount, lock_duration)`
- Stakes tokens in a pool
- Transfers tokens to pool vault
- Creates/updates user stake account

#### `claim_rewards()`
- Claims accumulated rewards
- Transfers rewards from reward vault

#### `unstake(amount)`
- Unstakes tokens from pool
- Applies slashing if early withdrawal
- Transfers tokens back to user

## 🚀 How to Interact

### Method 1: TypeScript/Web3.js (Recommended)

```bash
# Run the interactive CLI
npx ts-node interact.ts
```

### Method 2: Solana CLI

```bash
# Deploy the program
solana program deploy target/deploy/mindshare_staking_pool.so --url devnet

# Initialize program
solana program invoke <PROGRAM_ID> --accounts <ACCOUNTS> --data <INSTRUCTION_DATA>

# Create pool
solana program invoke <PROGRAM_ID> --accounts <ACCOUNTS> --data <INSTRUCTION_DATA>

# Stake tokens
solana program invoke <PROGRAM_ID> --accounts <ACCOUNTS> --data <INSTRUCTION_DATA>
```

### Method 3: Web Interface

Use the provided TypeScript classes to build a web interface:

```typescript
import { StakingPoolInteractor } from './interact';

const connection = new Connection("https://api.devnet.solana.com");
const interactor = new StakingPoolInteractor(connection);

// Airdrop SOL
await interactor.airdrop(2);

// Create test token
const mint = await interactor.createTestToken();

// Create user account
const userAccount = await interactor.createUserTokenAccount(mint);

// Mint tokens
await interactor.mintTokens(mint, userAccount, 1000000);
```

## 🔧 Development

### Prerequisites

- Rust 1.70+
- Solana CLI 1.16+
- Anchor 0.30.1
- Node.js 16+
- TypeScript 4.9+

### Setup

```bash
# Install dependencies
npm install

# Build the program
anchor build

# Run tests
anchor test
```

### Project Structure

```
mindshare-staking-pool/
├── programs/
│   └── mindshare-staking-pool/
│       └── src/
│           └── lib.rs          # Main program logic
├── tests/
│   ├── integration-test.ts     # Integration tests
│   └── simple-test.ts          # Basic tests
├── interact.ts                 # CLI interaction tool
├── cli.ts                      # Interactive CLI
└── README.md                   # This file
```

## 📊 Program Derived Addresses

The program uses PDAs for secure token management:

- **Program State**: `["program_state"]`
- **Pool**: `["pool", pool_id]`
- **Pool Vault**: `["pool_vault", pool_id]`
- **Reward Vault**: `["reward_vault", pool_id]`
- **User Stake**: `["user_stake", user_pubkey, pool_id]`

## 🔒 Security Features

- **Access Control**: Admin-only functions for critical operations
- **PDA Security**: All token vaults are program-controlled
- **Slashing Protection**: Penalties prevent gaming
- **Pool Limits**: Capacity controls prevent over-staking
- **Emergency Pause**: Circuit breaker functionality

## 🎯 Usage Examples

### Create a Staking Pool

```typescript
// Derive PDAs
const [pool] = PublicKey.findProgramAddressSync(
  [Buffer.from("pool"), poolIdBuffer],
  programId
);

// Create pool instruction
const createPoolIx = new TransactionInstruction({
  keys: [
    { pubkey: programState, isSigner: false, isWritable: true },
    { pubkey: pool, isSigner: false, isWritable: true },
    { pubkey: tokenMint, isSigner: false, isWritable: false },
    { pubkey: poolVault, isSigner: false, isWritable: true },
    { pubkey: rewardVault, isSigner: false, isWritable: true },
    { pubkey: admin, isSigner: true, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  programId,
  data: Buffer.from([...]) // Instruction data
});
```

### Stake Tokens

```typescript
// Derive user stake PDA
const [userStake] = PublicKey.findProgramAddressSync(
  [Buffer.from("user_stake"), user.publicKey.toBuffer(), poolIdBuffer],
  programId
);

// Stake instruction
const stakeIx = new TransactionInstruction({
  keys: [
    { pubkey: pool, isSigner: false, isWritable: true },
    { pubkey: userStake, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: true, isWritable: false },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolVault, isSigner: false, isWritable: true },
    { pubkey: tokenMint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  programId,
  data: Buffer.from([...]) // Instruction data
});
```

## 🚨 Important Notes

1. **Stack Size**: The contract was optimized to avoid Solana's 4KB stack limit
2. **IDL Generation**: Currently has compatibility issues with Anchor 0.30.1
3. **Testing**: Use the provided test scripts for verification
4. **Deployment**: Deploy to devnet first for testing

## 📝 Next Steps

1. **Deploy to Devnet**: Test with real transactions
2. **Fix IDL Generation**: Resolve Anchor compatibility issues
3. **Add Frontend**: Build web interface for users
4. **Audit**: Security review before mainnet deployment
5. **Documentation**: Complete API documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For questions or issues:
- Create an issue on GitHub
- Check the test files for examples
- Review the Solana documentation

---

**Happy Staking! 🚀**
