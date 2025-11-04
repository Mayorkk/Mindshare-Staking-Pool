# Frontend Integration Guide

## Program Details
- **Program ID**: `CzSrtvHksDXtM9nFpwGuQ3QQVwNTEXD6jPUjkpqwMjhd`
- **Network**: Devnet
- **Explorer**: https://explorer.solana.com/address/CzSrtvHksDXtM9nFpwGuQ3QQVwNTEXD6jPUjkpqwMjhd?cluster=devnet

## What's Been Added

### 1. Program Integration Library (`frontend/lib/program.ts`)
This file contains all the functions to interact with your staking program:
- `getProgram()` - Initialize Anchor program
- `initializeProgram()` - Initialize the program state
- `createPool()` - Create a new staking pool
- `stake()` - Stake tokens
- `claimRewards()` - Claim rewards
- `unstake()` - Unstake tokens
- `fetchPool()` - Get pool data
- `fetchUserStake()` - Get user's stake data
- `fetchProgramState()` - Get program state

### 2. Dependencies Installed
- `@coral-xyz/anchor` - Anchor framework for interacting with the program

## How to Interact with the Program

### Option 1: Using the Program Library

```typescript
import { getProgram, stake, claimRewards, unstake } from '@/lib/program';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';

function YourComponent() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  // Initialize provider and program
  const provider = new AnchorProvider(connection, { publicKey, signTransaction } as any);
  const program = getProgram(provider);

  // Stake tokens
  const handleStake = async (amount: number, lockDuration: number) => {
    const tx = await stake(
      program,
      publicKey!,
      1, // pool ID
      amount,
      lockDuration * 86400, // convert days to seconds
      userTokenAccount,
      poolVault,
      tokenMint
    );
    console.log('Stake transaction:', tx);
  };

  // Claim rewards
  const handleClaim = async () => {
    const tx = await claimRewards(
      program,
      publicKey!,
      1, // pool ID
      userTokenAccount,
      rewardVault,
      tokenMint
    );
    console.log('Claim transaction:', tx);
  };

  // Unstake tokens
  const handleUnstake = async (amount: number) => {
    const tx = await unstake(
      program,
      publicKey!,
      1, // pool ID
      amount,
      userTokenAccount,
      poolVault,
      tokenMint
    );
    console.log('Unstake transaction:', tx);
  };

  return (
    <div>
      <button onClick={() => handleStake(1000, 30)}>Stake 1000 tokens for 30 days</button>
      <button onClick={handleClaim}>Claim Rewards</button>
      <button onClick={() => handleUnstake(1000)}>Unstake 1000 tokens</button>
    </div>
  );
}
```

### Option 2: Direct Transaction (Manual)

```typescript
import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { getProgram } from '@/lib/program';

// 1. Initialize connection
const connection = new Connection('https://api.devnet.solana.com');

// 2. Get your wallet
const wallet = { publicKey: YOUR_PUBLIC_KEY, signTransaction, signAllTransactions };

// 3. Create provider
const provider = new AnchorProvider(connection, wallet as any);
const program = getProgram(provider);

// 4. Call program methods
const tx = await program.methods
  .stake(new BN(1000), new BN(2592000)) // 1000 tokens, 30 days
  .accounts({
    pool: POOL_ADDRESS,
    userStake: USER_STAKE_ADDRESS,
    user: wallet.publicKey,
    userTokenAccount: USER_TOKEN_ACCOUNT,
    poolVault: POOL_VAULT_ADDRESS,
    tokenMint: TOKEN_MINT_ADDRESS,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

console.log('Transaction signature:', tx);
```

## Important: Before Interacting

You need to:

1. **Deploy/Use an SPL Token**
   - The program needs a token mint address
   - Create a test token on devnet if you don't have one
   - Users need token accounts with the token

2. **Initialize the Program** (First time only)
   ```typescript
   const tx = await initializeProgram(program, adminPublicKey);
   ```

3. **Create a Pool** (First time only)
   ```typescript
   const tx = await createPool(
     program,
     adminPublicKey,
     1, // pool ID
     tokenMintAddress,
     1000000, // max stake amount
     2592000, // min lock period (30 days in seconds)
     500, // slashing rate (5% = 500/10000)
     1000 // base reward rate
   );
   ```

4. **Get Required Addresses**
   - Pool PDA addresses (derived from pool ID)
   - Vault addresses (pool vault, reward vault)
   - User token account address

## Testing Breaking Points

Based on your analysis document, test these scenarios:

1. **Stack Overflow in CreatePool**
   - The program has a stack warning
   - Test creating pools to see if it fails
   - If it fails, you'll need to optimize the code

2. **Token Account Validation**
   - Ensure users have valid token accounts
   - Test with accounts that don't have enough tokens

3. **Lock Period Enforcement**
   - Test early unstaking (should be slashed)
   - Test unstaking after lock period (no slash)

4. **Pool Capacity**
   - Test staking when pool is at max capacity
   - Should return "PoolCapacityExceeded" error

## Quick Start Commands

```bash
# Navigate to frontend
cd frontend

# Install dependencies (already done)
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Example Integration in Your Page

Update `frontend/app/page.tsx` to use the program library:

```typescript
import { getProgram, stake, claimRewards, fetchPool, fetchUserStake } from '@/lib/program';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral几天xyz/anchor';

// Add state for pool data
const [poolData, setPoolData] = useState(null);
const [userStakeData, setUserStakeData] = useState(null);

// Fetch pool data on mount
useEffect(() => {
  if (connected && publicKey) {
    const provider = new AnchorProvider(connection, {
      publicKey,
      signTransaction,
      signAllTransactions,
    } as any);
    const program = getProgram(provider);

    fetchPool(program, 1).then(setPoolData);
    fetchUserStake(program, publicKey, 1).then(setUserStakeData);
  }
}, [connected, publicKey]);

// Update handleStake to actually stake
const handleStake = async () => {
  const provider = new AnchorProvider(connection, {
    publicKey,
    signTransaction,
    signAllTransactions,
  } as any);
  const program = getProgram(provider);

  try {
    const tx = await stake(program, publicKey, 1, parseFloat(stakedAmount), 
      parseInt(unlockDuration) * 86400, userTokenAccount, poolVault, tokenMint);
    console.log('Staked! Transaction:', tx);
    alert(`Staked successfully! Tx: ${tx}`);
  } catch (error) {
    console.error('Stake failed:', error);
    alert('Stake failed: ' + error.message);
  }
};
```

## Next Steps

1. **Test the integration** - Create a test token and test staking
2. **Add proper error handling** - Handle all possible errors
3. **Add loading states** - Show loading indicators during transactions
4. **Fetch real data** - Replace mock data with actual on-chain data
5. **Test edge cases** - Test slashing, early unstaking, etc.

## Troubleshooting

- **"Account not found"** - Make sure the pool has been created first
- **"Insufficient funds"** - User needs SOL for fees + tokens to stake
- **"Invalid token account"** - Ensure the token account is valid
- **Stack overflow** - This is a known issue, may need code optimization






