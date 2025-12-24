const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying from', deployer.address);

  // For demo, we will not deploy a token; use the zero address so contract's eligibility
  // check will be `balanceOf` calls will revert if token is zero — this is acceptable
  // for a demo where eligibility is enabled by supplying a real token address.
  const tokenAddress = '0x0000000000000000000000000000000000000000';

  const PrivateVoting = await hre.ethers.getContractFactory('PrivateVoting');
  const now = Math.floor(Date.now() / 1000);
  // set window: yesterday -> tomorrow (useful for demo/testing)
  const start = now - 24 * 60 * 60; // 24 hours ago
  const end = now + 24 * 60 * 60; // 24 hours from now

  const pv = await PrivateVoting.deploy(tokenAddress, start, end);
  await pv.waitForDeployment();
  console.log('PrivateVoting deployed at', pv.target);

  // Print address for use
  console.log('PRIVATE_VOTING_ADDRESS=' + pv.target);

  // Print address for use
  console.log('PRIVATE_VOTING_ADDRESS=' + pv.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
