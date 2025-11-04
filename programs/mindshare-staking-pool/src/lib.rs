use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("CTFpHFmLKeiC7dyccTtmR1ex5HAoq2i1MwMenD4Qrsxi");

#[program]
pub mod mindshare_staking_pool {
    use super::*;

    pub fn initialize_program(
        ctx: Context<InitializeProgram>,
        admin: Pubkey,
    ) -> Result<()> {
        let program_state = &mut ctx.accounts.program_state;
        program_state.admin = admin;
        program_state.total_pools = 0;
        program_state.is_paused = false;
        program_state.bump = ctx.bumps.program_state;
        
        msg!("Program initialized with admin: {:?}", admin);
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
        let pool = &mut ctx.accounts.pool;
        let program_state = &mut ctx.accounts.program_state;
        
        require!(!program_state.is_paused, ErrorCode::ProgramPaused);
        
        program_state.total_pools = program_state.total_pools.checked_add(1).unwrap();
        
        pool.pool_id = pool_id;
        pool.token_mint = ctx.accounts.token_mint.key();
        pool.pool_vault = ctx.accounts.pool_vault.key();
        pool.reward_vault = ctx.accounts.reward_vault.key();
        pool.admin = ctx.accounts.admin.key();
        pool.max_stake_amount = max_stake_amount;
        pool.current_staked = 0;
        pool.min_lock_period = min_lock_period;
        pool.slashing_rate = slashing_rate;
        pool.base_reward_rate = base_reward_rate;
        pool.performance_multiplier = 10000;
        pool.created_at = Clock::get()?.unix_timestamp;
        pool.is_active = true;
        pool.bump = ctx.bumps.pool;
        
        msg!("Pool {} created", pool_id);
        Ok(())
    }

    pub fn stake(
        ctx: Context<Stake>,
        amount: u64,
        lock_duration: i64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let user_stake = &mut ctx.accounts.user_stake;
        let clock = Clock::get()?;
        
        require!(pool.is_active, ErrorCode::PoolInactive);
        require!(lock_duration >= pool.min_lock_period, ErrorCode::InvalidLockPeriod);
        require!(
            pool.current_staked.checked_add(amount).unwrap() <= pool.max_stake_amount,
            ErrorCode::PoolCapacityExceeded
        );
        require!(amount > 0, ErrorCode::InvalidAmount);
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.pool_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        
        if user_stake.user == Pubkey::default() {
            user_stake.user = ctx.accounts.user.key();
            user_stake.pool_id = pool.pool_id;
            user_stake.stake_amount = amount;
            user_stake.lock_duration = lock_duration;
            user_stake.staked_at = clock.unix_timestamp;
            user_stake.lock_until = clock.unix_timestamp.checked_add(lock_duration).unwrap();
            user_stake.last_claimed = clock.unix_timestamp;
            user_stake.pending_rewards = 0;
            user_stake.is_slashed = false;
            user_stake.bump = ctx.bumps.user_stake;
        } else {
            user_stake.stake_amount = user_stake.stake_amount.checked_add(amount).unwrap();
            let new_lock_until = clock.unix_timestamp.checked_add(lock_duration).unwrap();
            if new_lock_until > user_stake.lock_until {
                user_stake.lock_until = new_lock_until;
                user_stake.lock_duration = lock_duration;
            }
        }
        
        pool.current_staked = pool.current_staked.checked_add(amount).unwrap();
        
        msg!("User staked {} tokens", amount);
        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let user_stake = &mut ctx.accounts.user_stake;
        let pool = &ctx.accounts.pool;
        let clock = Clock::get()?;
        
        let time_elapsed = clock.unix_timestamp.checked_sub(user_stake.last_claimed).unwrap();
        let rewards = calculate_rewards(
            user_stake.stake_amount,
            time_elapsed,
            pool.base_reward_rate,
            pool.performance_multiplier,
        );
        
        if rewards > 0 {
            let pool_id_bytes = pool.pool_id.to_le_bytes();
            let seeds = &[
                b"reward_vault",
                pool_id_bytes.as_ref(),
                &[pool.bump],
            ];
            let signer = &[&seeds[..]];
            
            let cpi_accounts = Transfer {
                from: ctx.accounts.reward_vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer,
            );
            token::transfer(cpi_ctx, rewards)?;
            
            user_stake.pending_rewards = 0;
            user_stake.last_claimed = clock.unix_timestamp;
            
            msg!("User claimed {} reward tokens", rewards);
        }
        
        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        let user_stake = &mut ctx.accounts.user_stake;
        let pool = &ctx.accounts.pool;
        let clock = Clock::get()?;
        
        require!(amount <= user_stake.stake_amount, ErrorCode::InsufficientStake);
        require!(!user_stake.is_slashed, ErrorCode::StakeSlashed);
        
        let is_early = clock.unix_timestamp < user_stake.lock_until;
        let slashing_penalty = if is_early {
            calculate_slashing_penalty(
                amount,
                user_stake.lock_until.checked_sub(clock.unix_timestamp).unwrap(),
                pool.slashing_rate,
            )
        } else {
            0
        };
        
        let unstake_amount = amount.checked_sub(slashing_penalty).unwrap();
        
        let pool_id_bytes = pool.pool_id.to_le_bytes();
        let seeds = &[
            b"pool_vault",
            pool_id_bytes.as_ref(),
            &[pool.bump],
        ];
        let signer = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        token::transfer(cpi_ctx, unstake_amount)?;
        
        user_stake.stake_amount = user_stake.stake_amount.checked_sub(amount).unwrap();
        
        if is_early {
            msg!("Early unstake: {} slashed, {} returned", slashing_penalty, unstake_amount);
        } else {
            msg!("User unstaked {} tokens", amount);
        }
        
        Ok(())
    }
}

fn calculate_rewards(
    stake_amount: u64,
    time_staked: i64,
    base_rate: u64,
    performance_multiplier: u64,
) -> u64 {
    let base_reward = stake_amount
        .checked_mul(time_staked as u64)
        .unwrap()
        .checked_mul(base_rate)
        .unwrap();
    
    let performance_bonus = base_reward
        .checked_mul(performance_multiplier)
        .unwrap()
        .checked_div(10000)
        .unwrap();
    
    base_reward + performance_bonus
}

fn calculate_slashing_penalty(
    stake_amount: u64,
    time_remaining: i64,
    slashing_rate: u16,
) -> u64 {
    if time_remaining <= 0 {
        return 0;
    }
    
    stake_amount
        .checked_mul(slashing_rate as u64)
        .unwrap()
        .checked_div(10000)
        .unwrap()
}

#[account]
pub struct ProgramState {
    pub admin: Pubkey,
    pub total_pools: u64,
    pub is_paused: bool,
    pub bump: u8,
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
    pub bump: u8,
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
    pub bump: u8,
}

#[derive(Accounts)]
pub struct InitializeProgram<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 8 + 1 + 1,
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
    #[account(mut)]
    pub program_state: Account<'info, ProgramState>,
    
    #[account(
        init,
        payer = admin,
        space = 8 + 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 2 + 8 + 8 + 8 + 1 + 1,
        seeds = [b"pool", pool_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pool: Account<'info, StakingPool>,
    
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = admin,
        token::mint = token_mint,
        token::authority = pool,
        seeds = [b"pool_vault", pool_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pool_vault: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = admin,
        token::mint = token_mint,
        token::authority = pool,
        seeds = [b"reward_vault", pool_id.to_le_bytes().as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct Stake<'info> {
    #[account(mut)]
    pub pool: Account<'info, StakingPool>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1,
        seeds = [b"user_stake", user.key().as_ref(), pool_id.to_le_bytes().as_ref()],
        bump
    )]
    pub user_stake: Account<'info, UserStake>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,
    
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    pub pool: Account<'info, StakingPool>,
    
    #[account(mut)]
    pub user_stake: Account<'info, UserStake>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>,
    
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub pool: Account<'info, StakingPool>,
    
    #[account(mut)]
    pub user_stake: Account<'info, UserStake>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,
    
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid lock period")]
    InvalidLockPeriod,
    #[msg("Pool capacity exceeded")]
    PoolCapacityExceeded,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient stake")]
    InsufficientStake,
    #[msg("Stake slashed")]
    StakeSlashed,
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    #[msg("Pool inactive")]
    PoolInactive,
    #[msg("Invalid pool")]
    InvalidPool,
    #[msg("Invalid pool vault")]
    InvalidPoolVault,
    #[msg("Program paused")]
    ProgramPaused,
}