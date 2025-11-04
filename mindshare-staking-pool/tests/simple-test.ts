import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MindshareStakingPool } from "../target/types/mindshare_staking_pool";
import { expect } from "chai";

describe("mindshare-staking-pool", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.MindshareStakingPool as Program<MindshareStakingPool>;

  it("Program loads successfully", () => {
    expect(program).to.not.be.undefined;
    expect(program.methods).to.not.be.undefined;
    expect(program.methods.initializeProgram).to.not.be.undefined;
    expect(program.methods.createPool).to.not.be.undefined;
    expect(program.methods.stake).to.not.be.undefined;
    expect(program.methods.claimRewards).to.not.be.undefined;
    expect(program.methods.unstake).to.not.be.undefined;
  });

  it("Program ID is correct", () => {
    expect(program.programId.toString()).to.equal("CTFpHFmLKeiC7dyccTtmR1ex5HAoq2i1MwMenD4Qrsxi");
  });

  it("Account types are defined", () => {
    expect(program.account).to.not.be.undefined;
    expect(program.account.programState).to.not.be.undefined;
    expect(program.account.stakingPool).to.not.be.undefined;
    expect(program.account.userStake).to.not.be.undefined;
  });
});
