"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";

export default function Home() {
  const [stakedAmount, setStakedAmount] = useState("");
  const [unlockDuration, setUnlockDuration] = useState("30");
  const [loading, setLoading] = useState(false);
  const [poolData, setPoolData] = useState<any>(null);
  const [userStakeData, setUserStakeData] = useState<any>(null);
  
  // Solana wallet hooks
  const { publicKey, connected, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  
  const isConnected = connected && publicKey !== null;
  const walletAddress = publicKey?.toBase58() || "";

  // PROGRAM ID - Your deployed program
  const PROGRAM_ID = new PublicKey("CzSrtvHksDXtM9nFpwGuQ3QQVwNTEXD6jPUjkpqwMjhd");
  
  // Token mint (the one we just created)
  const TOKEN_MINT = new PublicKey("2mY9Dxiy1JmxDW26n91SUrcmYf4NhKTS9KFAwS59CKkG");
  
  // Pool ID
  const POOL_ID = 1;

  // Get program state PDA
  const [programStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("program_state")],
    PROGRAM_ID
  );

  // Get pool PDA  
  const [poolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), new BN(POOL_ID).toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );

  const getProvider = () => {
    if (!publicKey || !signTransaction) return null;
    return new AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction,
        signAllTransactions: async (txs) => {
          if (!signAllTransactions) return txs.map(tx => ({ publicKey, signTransaction }));
          return signAllTransactions(txs);
        },
      } as any,
      { commitment: "confirmed" }
    );
  };

  const handleInitialize = async () => {
    if (!publicKey || !signTransaction) {
      alert("Please connect your wallet");
      return;
    }

    setLoading(true);
    try {
      const provider = getProvider();
      if (!provider) return;

      const tx = await provider.connection.getLatestBlockhash();
      
      alert("⚠️ Note: Program initialization needs to be done first via a script.\n\nThe program is deployed. Next step: Create a pool.\n\nCheck the HOW_TO_USE.md for instructions.");
      
    } catch (error: any) {
      console.error("Initialize error:", error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePool = async () => {
    if (!publicKey || !signTransaction) {
      alert("Please connect your wallet");
      return;
    }

    alert("⚠️ Note: Pool creation has a stack overflow warning.\n\nThis might fail. If it does, we'll need to optimize the CreatePool account structure.\n\nCheck the deployment status for details.");
  };

  const handleStake = async () => {
    if (!stakedAmount || parseFloat(stakedAmount) <= 0) {
      alert("Please enter a valid amount to stake");
      return;
    }

    if (!publicKey) {
      alert("Please connect your wallet");
      return;
    }

    setLoading(true);
    try {
      alert(`To stake ${stakedAmount} tokens for ${unlockDuration} days:\n\n1. Ensure you have the SPL token in your wallet\n2 Claim tokens from the vault\n3. Call the stake function\n\nCheck FRONTEND_INTEGRATION.md for the complete code.`);
    } catch (error: any) {
      console.error("Stake error:", error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!publicKey) {
      alert("Please connect your wallet");
      return;
    }
    alert("To unstake:\n\n1. Verify your stake position\n2. Check if lock period expired\n3. Call unstake function\n\nNote: Early unstaking incurs slashing penalty.");
  };

  const handleClaim = async () => {
    if (!publicKey) {
      alert("Please connect your wallet");
      return;
    }
    alert("To claim rewards:\n\n1. Verify you have pending rewards\n2. Check reward vault has tokens\n3. Call claimRewards function");
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-blue-500/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Mindshare
              </h1>
              <p className="text-xs text-gray-400">Program: {PROGRAM_ID.toBase58().slice(0, 8)}...</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !rounded-lg" />
            {connected && (
              <div className="text-xs text-gray-400">
                Devnet: {programStatePDA.toBase58().slice(0, 8)}...
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold mb-4">
            Staking Pool
          </h2>
          <p className="text-xl text-gray-400 mb-2">
            Stake your tokens and earn variable rewards
          </p>
          <p className="text-gray-500">
            Time-locked staking with slashing penalties for early withdrawals
          </p>
          {connected && (
            <div className="mt-4 space-x-2">
              <button
                onClick={handleInitialize}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
                disabled={loading}
              >
                Init Program
              </button>
              <button
                onClick={handleCreatePool}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm"
                disabled={loading}
              >
                Create Pool
              </button>
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass rounded-xl p-6 glow-blue">
            <div className="text-gray-400 text-sm mb-2">Total Staked</div>
            <div className="text-3xl font-bold text-blue-400">1,234,567</div>
            <div className="text-sm text-gray-500 mt-1">Tokens</div>
          </div>
          <div className="glass rounded-xl p-6 glow-blue">
            <div className="text-gray-400 text-sm mb-2">APR</div>
            <div className="text-3xl font-bold text-green-400">12.5%</div>
            <div className="text-sm text-gray-500 mt-1">Variable based on performance</div>
          </div>
          <div className="glass rounded-xl p-6 glow-blue">
            <div className="text-gray-400 text-sm mb-2">Pool Capacity</div>
            <div className="text-3xl font-bold text-yellow-400">65%</div>
            <div className="text-sm text-gray-500 mt-1">2,500,000 / 3,000,000</div>
          </div>
        </div>

        {/* Main Staking Interface */}
        <div className="max-w-3xl mx-auto">
          <div className="glass rounded-2xl p-8 mb-6">
            <h3 className="text-2xl font-bold mb-6">Stake Tokens</h3>
            
            {/* Your Position */}
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Your Staked Balance</span>
                <span className="text-xl font-bold">0 tokens</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">Pending Rewards</span>
                <span className="text-xl font-bold text-green-400">0 tokens</span>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleClaim} className="btn-primary flex-1">
                  Claim Rewards
                </button>
                <button onClick={handleUnstake} className="btn-secondary flex-1">
                  Unstake
                </button>
              </div>
            </div>

            {/* Stake Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Amount to Stake</label>
                <input
                  type="number"
                  value={stakedAmount}
                  onChange={(e) => setStakedAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                />
                <div className="flex gap-2 mt-2">
                  <button className="text-sm px-3 py-1 bg-gray-700 rounded">25%</button>
                  <button className="text-sm px-3 py-1 bg-gray-700 rounded">50%</button>
                  <button className="text-sm px-3 py-1 bg-gray-700 rounded">75%</button>
                  <button className="text-sm px-3 py-1 bg-gray-700 rounded">MAX</button>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-2">Lock Duration</label>
                <select
                  value={unlockDuration}
                  onChange={(e) => setUnlockDuration(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                >
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                  <option value="180">180 Days</option>
                </select>
                <div className="mt-2 text-sm text-gray-400">
                  <span className="text-red-400">⚠️ Warning:</span> Early withdrawal before lock period incurs slashing penalty
                </div>
              </div>

              <button
                onClick={handleStake}
                disabled={!connected || !stakedAmount}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                  connected && stakedAmount
                    ? "btn-primary"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                {loading ? "Processing..." : connected ? "Stake Tokens" : "Connect Wallet to Stake"}
              </button>
            </div>
          </div>

          {/* Pool Information */}
          <div className="glass rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6">Pool Information</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Minimum Lock Period</span>
                <span className="font-semibold">30 days</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Slashing Rate</span>
                <span className="font-semibold text-red-400">5%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-700">
                <span className="text-gray-400">Performance Multiplier</span>
                <span className="font-semibold text-green-400">1.5x</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Token</span>
                <span className="font-mono font-semibold">Your SPL Token</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© 2024 Mindshare. Powered by Solana.</p>
          <p className="text-sm mt-2">Program ID: {PROGRAM_ID.toBase58()}</p>
          <p className="text-xs mt-1 text-gray-500">Token: {TOKEN_MINT.toBase58().slice(0, 16)}...</p>
        </div>
      </footer>
    </div>
  );
}