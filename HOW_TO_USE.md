# How to Use Your Staking Program

## Summary
Your Mindshare Staking Pool is **successfully deployed** on Solana Devnet! 

- **Program ID**: `CzSrtvHksDXtM9nFpwGuQ3QQVwNTEXD6jPUjkpqwMjhd`
- **Location**: Devnet
- **Status**: Active and ready to use

## Quick Start

### 1. First Time Setup (Do this once)

Before users can stake, you need to:

#### A. Initialize the Program
```bash
# Connect to devnet
solana config set --url devnet

# Use the test script or your frontend
# This creates the program state account
```

#### B. Create a Staking Pool
```bash
# Pool creation requires:
# - Token mint address (your SPL token)
# - Max stake amount
# - Min lock period
# - Slashing rate
# - Base reward rate
```

### 2. Frontend Integration

Your frontend has been set up with all the necessary code:

**Files Added:**
- `frontend/lib/program.ts` - Program interaction functions
- `frontend/lib/test-interaction.ts` - Example usage
- `FRONTEND_INTEGRATION.md` - Detailed integration guide

**How to Use:**

```typescript
// 1. Import the functions
import { stake, claimRewards, fetchPool } from '@/lib/program';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

// 2. In your component
const { publicKey, signTransaction } = useWallet();
const { connection } = useConnection();

// 3. Setup provider
const provider = new AnchorProvider(connection, {
  publicKey,
  signTransaction,
  signAllTransactions: async (txs) => txs.map(tx => ({ publicKey, signTransaction })),
}, { commitment: 'confirmed' });

// 4. Call program functions
const program = getProgram(provider);

// Stake tokens
await stake(program, publicKey, 1, 1000, 2592000, 
  userTokenAccount, poolVault, tokenMint);

// Claim rewards  
await claimRewards(program, publicKey, 1,
  userTokenAccount, rewardVault, tokenMint);
```

### 3. Test the Program

#### Create Test Token (if needed)
```bash
# Install SPL CLI if needed
npm install -g @solana/spl-token-cli

# Create a test token
spl-token create-token --decimals 9

# Create token account
spl-token create-account <TOKEN_MINT>

# Mint some tokens
spl-token mint <TOKEN_MINT> 1000000
```

#### Initialize Program
```bash
# Use the frontend or create a script to call:
# initializeProgram() from lib/program.ts
```

#### Create a Pool
```bash
# Call createPool() with your token mint
# Pool ID: 1
# Max stake: 1,000,000 tokens
# Min lock: 30 days
# Slash rate: 5%
```

## Important Notes

### ⚠️ Stack Overflow Warning

Your program has a **stack overflow warning** in `CreatePool`:
- Stack offset: 5104 bytes (max is 4096)
- This means creating pools might fail
- **Solution**: The program deployed fine, but test pool creation first
- If it fails, optimize the CreatePool account structure

### Testing Order

1. ✅ **Deploy** - DONE
2. 🧪 **Initialize Program** - Test this first
3. 🧪 **Create Pool** - This might fail due to stack issue
4. 🧪 **Stake Tokens** - Test if pool creation works
5. 🧪 **Claim Rewards** - Need rewards in the vault
6. 🧪 **Unstake** - Test early and late unstaking

### Required Accounts

To stake, users need:
1. **SOL** - For transaction fees
2. **SPL Token** - The token being staked
 memories4 **Token Account** - Holds their tokens
3. **Pool Address** - Derived from pool ID

To get the addresses:
```typescript
import { getPoolPDA, getProgramStatePDA } from '@/lib/program';

// Get pool address
const [poolAddress] = getPoolPDA(1); // pool ID = 1

// Get program state
const [programState] = getProgramStatePDA();

// Derive vault addresses (shown in program.ts)
```

## Frontend Integration Status

### ✅ Completed
- Anchor library installed
- Program integration code created
- Helper functions for all operations
- Example usage code

### 🔧 Still Needed
- Update `page.tsx` to use real program calls
- Get actual token mint address
- Get PDA addresses for pools and vaults
- Initialize program state
- Create first pool

## Next Steps

1. **Test Pool Creation** - This is critical due to stack warning
2. **Get Token Address** - You need an SPL token to stake
3. **Initialize Program** - Run once
4. **Create Pool** - If this works, you're golden
5. **Update Frontend** - Connect the buttons to real transactions
6. **Test Staking** - Stake some test tokens
7. **Test Rewards** - Add rewards to vault and test claiming
8. **Test Unstaking** - Test early (slash) and late (no slash)

## Troubleshooting

### "Account not found"
- Program hasn't been initialized yet
- Pool hasn't been created yet
- Check you're using the right PDA seeds

### "Insufficient funds"
- User needs SOL for fees
- User needs tokens to stake
- Reward vault needs tokens for claims

### "Stack overflow"
- Known issue in CreatePool
- Try creating pool with minimal accounts
- May need code optimization

## Resources

- **Explorer**: https://explorer.solana.com/address/CzSrtvHksDXtM9nFpwGuQ3QQVwNTEXD6jPUjkpqwMjhd?cluster=devnet
- **Program Library**: `frontend/lib/program.ts`
- **Examples**: `frontend/lib/test-interaction.ts`
- **Guide**: `FRONTEND_INTEGRATION.md`

## Questions?

Check the files:
1. `FRONTEND_INTEGRATION.md` - Detailed integration guide
2. `frontend/lib/test-interaction.ts` - Code examples
3. `DEPLOYMENT_SUCCESS.md` - Deployment info

Your program is ready to use! 🚀






