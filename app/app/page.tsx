"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useStaking } from "../hooks/useStaking";
import { useState } from "react";

export default function Home() {
  const { balance, stakedAmount, loading, stake, unstake } = useStaking();
  const [amount, setAmount] = useState("");

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <WalletMultiButton />
      </div>

      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700">
        <h1 className="text-3xl font-bold mb-6 text-center text-purple-400">Mindshare Staking</h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-700 p-4 rounded-xl text-center">
            <p className="text-gray-400 text-sm">Wallet Balance</p>
            <p className="text-2xl font-bold">{balance.toFixed(2)}</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-xl text-center">
            <p className="text-gray-400 text-sm">Your Stake</p>
            <p className="text-2xl font-bold">{stakedAmount.toFixed(2)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 px-4 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <span className="absolute right-4 top-3 text-gray-500">TOKENS</span>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => stake(Number(amount))}
              disabled={loading || !amount}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all"
            >
              {loading ? "Processing..." : "Stake"}
            </button>
            <button
              onClick={() => unstake(Number(amount))}
              disabled={loading || !amount}
              className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all"
            >
              Unstake
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Make sure you are on Devnet and have tokens.
        </p>
      </div>
    </div>
  );
}