import { useEffect, useState, useMemo, useCallback } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, BN, web3, utils } from "@coral-xyz/anchor"; // Added utils here
import { PublicKey } from "@solana/web3.js";
import { 
  getAssociatedTokenAddressSync, 
  TOKEN_PROGRAM_ID 
} from "@solana/spl-token";
import idl from "../utils/idl.json";
import { PROGRAM_ID, STAKING_MINT, POOL_ID } from "../utils/constants";

// CONSTANTS
const DECIMALS = 9; // <--- CHECK YOUR MINT! (Devnet usually 6, Mainnet often 9)
const MULTIPLIER = 10 ** DECIMALS;

export const useStaking = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [balance, setBalance] = useState(0);
  const [stakedAmount, setStakedAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 1. Initialize Program
  const program = useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, {});
    return new Program(idl as any, provider);
  }, [connection, wallet]);

  // 2. Helper: Derive PDAs
  // We define this as a helper so both fetchData and stake/unstake can use it freshly
  const getPDAs = useCallback(() => {
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), new BN(POOL_ID).toArrayLike(Buffer, "le", 8)],
      PROGRAM_ID
    );
    
    let userStakePda = null;
    if (wallet) {
      [userStakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_stake"), poolPda.toBuffer(), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
    }
    return { poolPda, userStakePda };
  }, [wallet]);

  // 3. Fetch Data
  const fetchData = useCallback(async () => {
    if (!program || !wallet) return;
    
    const { userStakePda } = getPDAs();
    if (!userStakePda) return;

    try {
      // A. Fetch User Stake Data
      try {
        // @ts-ignore
        const userStakeAccount = await program.account.userStake.fetch(userStakePda);
        setStakedAmount(userStakeAccount.stakeAmount.toNumber() / MULTIPLIER); 
      } catch (e) {
        setStakedAmount(0); // No account = 0 staked
      }

      // B. Fetch Wallet Token Balance
      const userAta = getAssociatedTokenAddressSync(STAKING_MINT, wallet.publicKey);
      try {
        const balanceInfo = await connection.getTokenAccountBalance(userAta);
        setBalance(balanceInfo.value.uiAmount || 0);
      } catch (e) {
        setBalance(0); // No ATA = 0 balance
      }

    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [program, wallet, getPDAs, connection]);

  // Initial Fetch
  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(intervalId);
  }, [fetchData]);

  // 4. Stake Function
  const stake = async (amount: number) => {
    if (!program || !wallet) return;

    setLoading(true);

    try {
      // Derive PDAs freshly
      const { poolPda, userStakePda } = getPDAs();
      
      if (!poolPda || !userStakePda) {
        console.error("PDAs could not be derived");
        return;
      }

      console.log("---------------------------------------------------");
      console.log("🔍 DEBUGGING STAKE ERROR");
      console.log("Frontend expects Pool at:", poolPda.toString());
      console.log("Pool ID used:", POOL_ID.toString());
      console.log("---------------------------------------------------");

      // Derive Token Accounts
      const userAta = getAssociatedTokenAddressSync(
          STAKING_MINT, 
          wallet.publicKey
      );
      
      const poolVault = getAssociatedTokenAddressSync(
          STAKING_MINT, 
          poolPda, 
          true // allowOwnerOffCurve = true (Vital for PDAs)
      );

      // Send Transaction
      const tx = await program.methods
        .stake(new BN(amount * MULTIPLIER), new BN(0))
        .accounts({
          pool: poolPda,
          userStake: userStakePda,
          user: wallet.publicKey,
          tokenMint: STAKING_MINT,
          userTokenAccount: userAta,
          poolVault: poolVault,
          tokenProgram: TOKEN_PROGRAM_ID, // Using imported constant
          systemProgram: web3.SystemProgram.programId,
        } as any)
        .rpc();
      
      console.log("✅ Staked successfully! Signature:", tx);
      await fetchData(); 
      
    } catch (error) {
      console.error("❌ Stake failed:", error);
      const msg = (error as Error).message || (error as any).toString();
      
      if (msg.includes("AccountNotInitialized") || msg.includes("3012")) {
         alert(`ERROR: The Pool Account does not exist on Devnet.\n\nAddress: ${getPDAs().poolPda.toString()}\n\nSolution: Run 'anchor run init-devnet'.`);
      } else {
         alert("Stake Failed: " + msg);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // 5. Unstake Function
  const unstake = async (amount: number) => {
    if (!program || !wallet) return;
    setLoading(true);

    try {
      const { poolPda, userStakePda } = getPDAs();
      if(!poolPda || !userStakePda) return;

      const userAta = getAssociatedTokenAddressSync(STAKING_MINT, wallet.publicKey);
      const poolVault = getAssociatedTokenAddressSync(STAKING_MINT, poolPda, true);

      const tx = await program.methods
        .unstake(new BN(amount * MULTIPLIER))
        .accounts({
          pool: poolPda,
          userStake: userStakePda,
          user: wallet.publicKey, // Add user here
          tokenMint: STAKING_MINT,
          userTokenAccount: userAta,
          poolVault: poolVault,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)
        .rpc();

      console.log("Unstaked!", tx);
      await fetchData();
    } catch (error) {
      console.error("Unstake failed:", error);
      const msg = (error as Error).message || (error as any).toString();
      alert("Unstake Failed: " + msg);
    } finally {
      setLoading(false);
    }
  };

  return { balance, stakedAmount, loading, stake, unstake };
};