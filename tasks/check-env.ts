import { task } from "hardhat/config";
import { vars } from "hardhat/config";

function mask(value: string, visible: number = 4) {
  if (!value) return "<not-set>";
  if (value.length <= visible * 2) return "<hidden>";
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

/**
 * Prints whether required variables are configured for network operations.
 */
task("check-env", "Checks required Hardhat vars for deployments").setAction(async () => {
  const infura = vars.get("INFURA_API_KEY", "");
  const mnemonic = vars.get("MNEMONIC", "");
  const etherscan = vars.get("ETHERSCAN_API_KEY", "");

  console.log("Env/Vars status:");
  console.log(`- INFURA_API_KEY: ${infura ? mask(infura) : "<not-set>"}`);
  console.log(`- MNEMONIC: ${mnemonic ? "<set>" : "<not-set>"}`);
  console.log(`- ETHERSCAN_API_KEY: ${etherscan ? mask(etherscan) : "<not-set>"}`);

  if (!infura) {
    console.log("\nAction: set your Infura Project ID:");
    console.log("  npx hardhat vars set INFURA_API_KEY");
  }
  if (!mnemonic) {
    console.log("\nAction: set a mnemonic with a funded Sepolia account #0:");
    console.log("  npx hardhat vars set MNEMONIC");
  }
});
