const anchor = require('@coral-xyz/anchor');
const { PublicKey, SystemProgram } = require('@solana/web3.js');

async function main() {
  console.log('🚀 Initializing Mindshare Staking Pool...');

  const provider = anchor.AnchorProvider.env();
  const PROGRAM_ID = new PublicKey("CzSrtvHksDXtM9nFpwGuQ3QQVwNTEXD6jPUjkpqwMjhd");

  console.log('Program ID:', PROGRAM_ID.toString());
  console.log('Provider:', provider.wallet.publicKey.toString());

  // Get the program state PDA
  const [programState, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('program_state')],
    PROGRAM_ID
  );

  console.log('\n📋 Program State PDA:', programState.toString());
  console.log('Bump:', bump);

  try {
    console.log('\n⏳ Initializing program...');

    // We'll use solana program invoke directly
    console.log('\n⚠️  Note: You need to initialize via Anchor or direct transaction');
    console.log('The program is already deployed. You can now create pools.');
    console.log('Use the frontend integration or create a pool manually.');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });






