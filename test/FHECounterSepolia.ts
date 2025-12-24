import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { FHECounter } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("FHECounterSepolia", function () {
  let signers: Signers;
  let fheCounterContract: FHECounter;
  let fheCounterContractAddress: string;
  let aliceAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const FHECounterDeployement = await deployments.get("FHECounter");
      fheCounterContractAddress = FHECounterDeployement.address;
      fheCounterContract = await ethers.getContractAt("FHECounter", FHECounterDeployement.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
    aliceAddress = await signers.alice.getAddress();

    // Skip the Sepolia tests if the signer has too little ETH (prevents insufficient funds errors)
    console.log(`FHECounterSepolia: using aliceAddress=${aliceAddress}`);
    try {
      const rawBal = await ethers.provider.getBalance(aliceAddress);
      console.log(`FHECounterSepolia: raw balance for ${aliceAddress}: ${String(rawBal)}`);
      const minNeeded = 1_000_000_000_000_000n; // 0.001 ETH
      let balBigInt: bigint;
      if (typeof rawBal === 'bigint') {
        balBigInt = rawBal;
      } else {
        // cover ethers BigNumber or other numeric-like objects
        balBigInt = BigInt(String(rawBal));
      }

      if (balBigInt < minNeeded) {
        console.warn('Skipping Sepolia tests: signer has insufficient funds (need >= 0.001 ETH)');
        this.skip();
      }
    } catch (e) {
      // if balance check fails for any reason, skip to avoid spurious test failures
      console.warn('Could not determine signer balance, skipping Sepolia tests', e);
      this.skip();
    }
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("increment the counter by 1", async function () {
    steps = 10;

    this.timeout(4 * 40000);

    progress("Encrypting '0'...");
    const encryptedZero = await fhevm
      .createEncryptedInput(fheCounterContractAddress, aliceAddress)
      .add32(0)
      .encrypt();

    progress(
      `Call increment(0) FHECounter=${fheCounterContractAddress} handle=${ethers.hexlify(encryptedZero.handles[0])} signer=${aliceAddress}...`,
    );
    let tx = await fheCounterContract
      .connect(signers.alice)
      .increment(encryptedZero.handles[0], encryptedZero.inputProof);
    await tx.wait();

    progress(`Call FHECounter.getCount()...`);
    const encryptedCountBeforeInc = await fheCounterContract.getCount();
    expect(encryptedCountBeforeInc).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting FHECounter.getCount()=${encryptedCountBeforeInc}...`);
    const clearCountBeforeInc = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountBeforeInc,
      fheCounterContractAddress,
      signers.alice,
    );
    progress(`Clear FHECounter.getCount()=${clearCountBeforeInc}`);

    progress(`Encrypting '1'...`);
    const encryptedOne = await fhevm
      .createEncryptedInput(fheCounterContractAddress, aliceAddress)
      .add32(1)
      .encrypt();

    progress(
      `Call increment(1) FHECounter=${fheCounterContractAddress} handle=${ethers.hexlify(encryptedOne.handles[0])} signer=${aliceAddress}...`,
    );
    tx = await fheCounterContract.connect(signers.alice).increment(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    progress(`Call FHECounter.getCount()...`);
    const encryptedCountAfterInc = await fheCounterContract.getCount();

    progress(`Decrypting FHECounter.getCount()=${encryptedCountAfterInc}...`);
    const clearCountAfterInc = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfterInc,
      fheCounterContractAddress,
      signers.alice,
    );
    progress(`Clear FHECounter.getCount()=${clearCountAfterInc}`);

    expect(clearCountAfterInc - clearCountBeforeInc).to.eq(1);
  });
});
