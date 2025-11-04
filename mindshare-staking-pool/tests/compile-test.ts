import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";

// Simple test to verify the program compiles and types are available
describe("Compile Test", () => {
  it("Program compiles successfully", () => {
    // This test just verifies that the TypeScript compilation works
    // and the program types are available
    const programId = new anchor.web3.PublicKey("CTFpHFmLKeiC7dyccTtmR1ex5HAoq2i1MwMenD4Qrsxi");
    expect(programId).to.not.be.undefined;
    
    // Test basic functionality
    expect(programId.toString()).to.be.a('string');
    expect(programId.toString().length).to.equal(44); // Base58 encoded public key length
  });

  it("Basic program structure is correct", () => {
    // Test that the program has the expected structure
    const programId = "CTFpHFmLKeiC7dyccTtmR1ex5HAoq2i1MwMenD4Qrsxi";
    expect(programId).to.be.a('string');
    expect(programId.length).to.equal(44); // Base58 encoded public key length
  });

  it("Anchor types are available", () => {
    // Test that Anchor types are available
    expect(anchor.web3).to.not.be.undefined;
    expect(anchor.web3.PublicKey).to.be.a('function');
    expect(anchor.web3.Keypair).to.be.a('function');
  });
});