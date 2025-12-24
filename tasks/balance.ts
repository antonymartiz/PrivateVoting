import { task } from "hardhat/config";

/**
 * Prints deployer address and balance for the selected network.
 */
task("balance", "Shows deployer address and balance").setAction(async (_args, hre) => {
  const { deployer } = await hre.getNamedAccounts();
  const bal = await hre.ethers.provider.getBalance(deployer);
  const eth = hre.ethers.formatEther(bal);
  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer}`);
  console.log(`Balance:  ${eth} ETH`);
});
