use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked, Burn};

declare_id!("CzSrtvHksDXtM9nFpwGuQ3QQVwNTEXD6jPUjkpqwMjhd");

// ─────── CONSTANTS ───────
// Precision for math calculations to allow fractional APY
// e.g. Rate of 500 = 0.0005 tokens per second
pub const PRECISION_MULT: u128 = 1_000_000; 

#[program]
pub mod mindshare_staking_pool {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let program_state = &mut ctx.accounts.program_state;
        program_state.admin = ctx.accounts.payer.key();
        program_state.total_pools = 0;
        program_state.is_paused = false;
        program_state.bump = ctx.bumps.program_state;
        Ok(())
    }

    pub fn create_pool(
        ctx: Context<CreatePool>,
        pool_id: u64,
        max_stake_amount: u64,
        min_lock_period: i64,
        slashing_rate: u16,
        base_reward_rate: u64,
    ) -> Result<()> {
        let state = &mut ctx.accounts.program_state;
        let pool = &mut ctx.accounts.pool;

        require!(!state.is_paused, ErrorCode::ProgramPaused);
        require!(max_stake_amount > 0, ErrorCode::InvalidAmount);
        // Slashing rate is in Basis Points (10000 = 100%)
        require!(slashing_rate <= 10000, ErrorCode::InvalidAmount);

        state.total_pools = state.total_pools.checked_add(1).ok_or(ErrorCode::MathOverflow)?;

        pool.pool_id = pool_id;
        pool.token_mint = ctx.accounts.token_mint.key();
        pool.admin = ctx.accounts.admin.key();
        
        // Vaults are now PDAs derived from the pool, initialized in separate steps
        // We set them to default here, but the init_vault functions will validate the addresses match seeds
        pool.pool_vault = Pubkey::default(); 
        pool.reward_vault = Pubkey::default();
        
        pool.max_stake_amount = max_stake_amount;
        pool.current_staked = 0;
        pool.min_lock_period = min_lock_period;
        pool.slashing_rate = slashing_rate;
        pool.base_reward_rate = base_reward_rate;
        pool.performance_multiplier = 10000; // 1.0x default
        pool.created_at = Clock::get()?.unix_timestamp;
        pool.is_active = true;
        pool.bump = ctx.bumps.pool;

        Ok(())
    }

    // UPDATED: Now creates the Vault as a PDA owned by the Pool
    pub fn init_pool_vault(ctx: Context<InitPoolVault>, _pool_id: u64) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.pool_vault = ctx.accounts.pool_vault.key();
        Ok(())
    }

    // UPDATED: Now creates the Reward Vault as a PDA owned by the Pool
    pub fn init_reward_vault(ctx: Context<InitRewardVault>, _pool_id: u64) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.reward_vault = ctx.accounts.reward_vault.key();
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64, lock_duration: i64) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let user_stake = &mut ctx.accounts.user_stake;
        let clock = Clock::get()?;

        require!(pool.is_active, ErrorCode::PoolInactive);
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(lock_duration >= pool.min_lock_period, ErrorCode::InvalidLockPeriod);
        
        // Validate vaults are initialized
        require!(pool.pool_vault != Pubkey::default(), ErrorCode::VaultNotInitialized);
        require!(ctx.accounts.pool_vault.key() == pool.pool_vault, ErrorCode::InvalidPoolVault);

        // Update Global State
        pool.current_staked = pool.current_staked.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
        require!(pool.current_staked <= pool.max_stake_amount, ErrorCode::PoolCapacityExceeded);

        // --- Money Movement (CPI) ---
        // Using transfer_checked for safety against Fake Mints
        let decimals = ctx.accounts.token_mint.decimals;
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.user_token_account.to_account_info(),
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.pool_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token_interface::transfer_checked(cpi_ctx, amount, decimals)?;

        // --- State Logic ---
        if user_stake.user == Pubkey::default() {
            // First time initialization
            user_stake.user = ctx.accounts.user.key();
            user_stake.pool_id = pool.pool_id;
            user_stake.stake_amount = amount;
            user_stake.lock_duration = lock_duration;
            user_stake.staked_at = clock.unix_timestamp;
            user_stake.lock_until = clock.unix_timestamp.checked_add(lock_duration).ok_or(ErrorCode::MathOverflow)?;
            user_stake.last_claimed = clock.unix_timestamp;
            user_stake.pending_rewards = 0;
            user_stake.is_slashed = false;
            user_stake.bump = ctx.bumps.user_stake;
        } else {
            // Top Up Logic
            require!(user_stake.pool_id == pool.pool_id, ErrorCode::InvalidPool);
            user_stake.stake_amount = user_stake.stake_amount.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
            
            // Extend lock if new lock period is further out
            let new_lock_until = clock.unix_timestamp.checked_add(lock_duration).ok_or(ErrorCode::MathOverflow)?;
            if new_lock_until > user_stake.lock_until {
                user_stake.lock_until = new_lock_until;
                user_stake.lock_duration = lock_duration;
            }
        }

        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let pool = &ctx.accounts.pool;
        let user_stake = &mut ctx.accounts.user_stake;

        require!(user_stake.pool_id == pool.pool_id, ErrorCode::InvalidPool);
        require!(ctx.accounts.reward_vault.key() == pool.reward_vault, ErrorCode::InvalidPoolVault);

        let clock = Clock::get()?;
        let time_elapsed = clock.unix_timestamp.checked_sub(user_stake.last_claimed).ok_or(ErrorCode::InvalidTimestamp)?;
        
        if time_elapsed <= 0 { return Ok(()); }

        let rewards = calculate_rewards(
            user_stake.stake_amount,
            time_elapsed,
            pool.base_reward_rate,
            pool.performance_multiplier,
        )?;

        // Zero-check to save gas and prevent errors
        if rewards > 0 {
            // --- Checks-Effects-Interactions Pattern ---
            // 1. Update State FIRST to prevent re-entrancy
            user_stake.last_claimed = clock.unix_timestamp;
            user_stake.pending_rewards = 0; // Reset any pending if you were tracking them

            // 2. Prepare Signer (PDA)
            let pool_id_bytes: [u8; 8] = pool.pool_id.to_le_bytes();
            let bump_bytes: [u8; 1] = [pool.bump];
            let seeds: &[&[u8]] = &[b"pool", &pool_id_bytes, &bump_bytes];
            let signer: &[&[&[u8]]] = &[&seeds[..]];

            // 3. Perform Interaction (CPI)
            let decimals = ctx.accounts.token_mint.decimals;
            let cpi_accounts = TransferChecked {
                from: ctx.accounts.reward_vault.to_account_info(),
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer,
            );
            token_interface::transfer_checked(cpi_ctx, rewards, decimals)?;
        } else {
            // Update timestamp even if 0 rewards to prevent recounting time later
            user_stake.last_claimed = clock.unix_timestamp;
        }

        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        let pool = &ctx.accounts.pool;
        let user_stake = &mut ctx.accounts.user_stake;

        require!(user_stake.pool_id == pool.pool_id, ErrorCode::InvalidPool);
        require!(ctx.accounts.pool_vault.key() == pool.pool_vault, ErrorCode::InvalidPoolVault);
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(amount <= user_stake.stake_amount, ErrorCode::InsufficientStake);
        require!(!user_stake.is_slashed, ErrorCode::StakeSlashed);

        let clock = Clock::get()?;
        let is_early = clock.unix_timestamp < user_stake.lock_until;

        // Calculate Penalty
        let time_remaining = user_stake.lock_until.checked_sub(clock.unix_timestamp).unwrap_or(0);
        let slashing_penalty = if is_early && time_remaining > 0 { 
            calculate_slashing_penalty(amount, time_remaining, pool.slashing_rate)? 
        } else { 
            0 
        };
        
        require!(slashing_penalty <= amount, ErrorCode::MathOverflow);
        let return_amount = amount.checked_sub(slashing_penalty).ok_or(ErrorCode::MathOverflow)?;

        // PDA Signer Seeds
        let pool_id_bytes: [u8; 8] = pool.pool_id.to_le_bytes();
        let bump_bytes: [u8; 1] = [pool.bump];
        let seeds: &[&[u8]] = &[b"pool", &pool_id_bytes, &bump_bytes];
        let signer: &[&[&[u8]]] = &[&seeds[..]];

        // 1. Transfer the return amount to user
        let decimals = ctx.accounts.token_mint.decimals;
        let cpi_accounts_user = TransferChecked {
            from: ctx.accounts.pool_vault.to_account_info(),
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_ctx_user = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts_user,
            signer,
        );
        token_interface::transfer_checked(cpi_ctx_user, return_amount, decimals)?;

        // 2. Handle Penalty (Burn it to keep accounting clean)
        // Note: You could also transfer this to a treasury account
        if slashing_penalty > 0 {
            let cpi_accounts_burn = Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.pool_vault.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            };
            let cpi_ctx_burn = CpiContext::new_with_signer(
                 ctx.accounts.token_program.to_account_info(),
                 cpi_accounts_burn,
                 signer
            );
            token_interface::burn(cpi_ctx_burn, slashing_penalty)?;
        }

        // 3. Update State
        user_stake.stake_amount = user_stake.stake_amount.checked_sub(amount).ok_or(ErrorCode::MathOverflow)?;
        
        // Note: We do NOT close the account here. 
        // We leave that for a specific 'close_stake' instruction to recover rent.
        
        Ok(())
    }

    // NEW FUNCTION: Rent Recovery
    pub fn close_stake(ctx: Context<CloseStake>) -> Result<()> {
        let user_stake = &ctx.accounts.user_stake;
        require!(user_stake.stake_amount == 0, ErrorCode::StakeNotZero);
        // Add other checks if you have pending rewards
        Ok(())
    }
}

// ─────── CONTEXTS ───────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, 
        payer = payer, 
        space = ProgramState::LEN, // Use Constant
        seeds = [b"program_state"], 
        bump
    )]
    pub program_state: Account<'info, ProgramState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct CreatePool<'info> {
    #[account(
        init,
        payer = admin,
        space = StakingPool::LEN, // Use Constant
        seeds = [b"pool", pool_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pool: Account<'info, StakingPool>,
    
    // Constraint: Only the global admin can create pools
    #[account(
        mut, 
        seeds = [b"program_state"], 
        bump = program_state.bump,
        has_one = admin // KEY SECURITY CHECK
    )]
    pub program_state: Account<'info, ProgramState>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    pub token_mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct InitPoolVault<'info> {
    #[account(
        mut, 
        seeds = [b"pool", pool_id.to_le_bytes().as_ref()],
        bump = pool.bump,
        has_one = admin
    )]
    pub pool: Account<'info, StakingPool>,
    
    // UPDATED: Create the vault as a PDA Token Account
    #[account(
        init,
        payer = admin,
        token::mint = token_mint,
        token::authority = pool, // Pool PDA owns this!
        seeds = [b"pool_vault", pool.key().as_ref()],
        bump
    )]
    pub pool_vault: InterfaceAccount<'info, TokenAccount>,
    
    pub token_mint: InterfaceAccount<'info, Mint>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct InitRewardVault<'info> {
    #[account(
        mut, 
        seeds = [b"pool", pool_id.to_le_bytes().as_ref()],
        bump = pool.bump,
        has_one = admin
    )]
    pub pool: Account<'info, StakingPool>,

    // UPDATED: Create the vault as a PDA Token Account
    #[account(
        init,
        payer = admin,
        token::mint = token_mint,
        token::authority = pool,
        seeds = [b"reward_vault", pool.key().as_ref()],
        bump
    )]
    pub reward_vault: InterfaceAccount<'info, TokenAccount>,
    
    pub token_mint: InterfaceAccount<'info, Mint>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub pool: Account<'info, StakingPool>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = UserStake::LEN, // Use Constant
        seeds = [b"user_stake", pool.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_stake: Account<'info, UserStake>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_mint: InterfaceAccount<'info, Mint>,
    
    #[account(
        mut, 
        token::mint = token_mint,
        token::authority = user
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub pool_vault: InterfaceAccount<'info, TokenAccount>,
    
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub pool: Account<'info, StakingPool>,
    
    #[account(
        mut, 
        seeds = [b"user_stake", pool.key().as_ref(), user_stake.user.as_ref()], 
        bump = user_stake.bump
    )]
    pub user_stake: Account<'info, UserStake>,
    
    pub token_mint: InterfaceAccount<'info, Mint>,
    
    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub reward_vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub pool: Account<'info, StakingPool>,
    
    #[account(
        mut, 
        seeds = [b"user_stake", pool.key().as_ref(), user.key().as_ref()], 
        bump = user_stake.bump,
        has_one = user
    )]
    pub user_stake: Account<'info, UserStake>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_mint: InterfaceAccount<'info, Mint>,
    
    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub pool_vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct CloseStake<'info> {
    // We close the account and send the Rent SOL back to the user
    #[account(
        mut, 
        close = user,
        seeds = [b"user_stake", pool.key().as_ref(), user.key().as_ref()], 
        bump = user_stake.bump,
        has_one = user
    )]
    pub user_stake: Account<'info, UserStake>,
    
    pub pool: Account<'info, StakingPool>, // Needed for seeds derivation
    
    #[account(mut)]
    pub user: Signer<'info>,
}

// ─────── UTILS (MATH) ───────
fn calculate_rewards(stake: u64, time_staked: i64, base_rate: u64, perf_mult: u64) -> Result<u64> {
    if time_staked <= 0 { return Ok(0); }
    let t = time_staked as u128;
    
    // Logic: (Stake * Time * Rate) / Precision
    // Example: 1000 tokens * 10 seconds * 5 (0.0005%) / 1,000,000 
    let base = (stake as u128)
        .checked_mul(t).and_then(|v| v.checked_mul(base_rate as u128))
        .ok_or(ErrorCode::MathOverflow)?;
        
    // Apply Performance Multiplier (Basis Points)
    let bonus = base
        .checked_mul(perf_mult as u128).and_then(|v| v.checked_div(10000))
        .ok_or(ErrorCode::MathOverflow)?;
        
    // Apply Precision Division (Crucial for fractional rates)
    let final_amount = bonus.checked_div(PRECISION_MULT).ok_or(ErrorCode::MathOverflow)?;
    
    Ok(final_amount.min(u64::MAX as u128) as u64)
}

fn calculate_slashing_penalty(amount: u64, time_remaining: i64, slashing_rate: u16) -> Result<u64> {
    if time_remaining <= 0 { return Ok(0); }
    // Basis Points Calculation (Rate / 10000)
    let penalty = (amount as u128)
        .checked_mul(slashing_rate as u128).and_then(|v| v.checked_div(10000))
        .ok_or(ErrorCode::MathOverflow)?;
    Ok(penalty.min(u64::MAX as u128) as u64)
}

// ─────── DATA STRUCTURES (WITH LEN) ───────
#[account]
pub struct ProgramState { 
    pub admin: Pubkey, 
    pub total_pools: u64, 
    pub is_paused: bool, 
    pub bump: u8 
}

impl ProgramState {
    pub const LEN: usize = 8 + 32 + 8 + 1 + 1; // Discriminator + fields
}

#[account]
pub struct StakingPool { 
    pub pool_id: u64, 
    pub token_mint: Pubkey, 
    pub pool_vault: Pubkey, 
    pub reward_vault: Pubkey,
    pub admin: Pubkey, 
    pub max_stake_amount: u64, 
    pub current_staked: u64, 
    pub min_lock_period: i64,
    pub slashing_rate: u16, 
    pub base_reward_rate: u64, 
    pub performance_multiplier: u64,
    pub created_at: i64, 
    pub is_active: bool, 
    pub bump: u8 
}

impl StakingPool {
    // 8 + 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 2 + 8 + 8 + 8 + 1 + 1
    pub const LEN: usize = 8 + 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 2 + 8 + 8 + 8 + 1 + 1;
}

#[account]
pub struct UserStake { 
    pub user: Pubkey, 
    pub pool_id: u64, 
    pub stake_amount: u64, 
    pub lock_duration: i64,
    pub staked_at: i64, 
    pub lock_until: i64, 
    pub last_claimed: i64, 
    pub pending_rewards: u64,
    pub is_slashed: bool, 
    pub bump: u8
}

impl UserStake {
    // 8 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1;
}

// ─────── ERRORS ───────
#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized")] Unauthorized,
    #[msg("Invalid lock period")] InvalidLockPeriod,
    #[msg("Pool capacity exceeded")] PoolCapacityExceeded,
    #[msg("Invalid amount")] InvalidAmount,
    #[msg("Insufficient stake")] InsufficientStake,
    #[msg("Stake slashed")] StakeSlashed,
    #[msg("Invalid token mint")] InvalidTokenMint,
    #[msg("Pool inactive")] PoolInactive,
    #[msg("Invalid pool")] InvalidPool,
    #[msg("Invalid pool vault")] InvalidPoolVault,
    #[msg("Program paused")] ProgramPaused,
    #[msg("Timestamp error")] InvalidTimestamp,
    #[msg("Math overflow")] MathOverflow,
    #[msg("Vault not initialized")] VaultNotInitialized,
    #[msg("Stake not zero")] StakeNotZero,
}