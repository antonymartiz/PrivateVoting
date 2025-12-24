const fs = require('fs');
require('dotenv').config();
const paillier = require('paillier-bigint');
const fetch = (...args) => import('node-fetch').then(({default:fetch})=>fetch(...args));

async function main() {
  const providerUrl = process.env.PROVIDER_URL || 'http://127.0.0.1:8545';
  const contractAddr = process.env.VOTING_CONTRACT_ADDRESS;
  if (!contractAddr) throw new Error('VOTING_CONTRACT_ADDRESS not set in .env');

  const raw = JSON.parse(fs.readFileSync('.keys/paillier-key.json'));
  const pub = raw.publicKey;
  const publicKey = new paillier.PublicKey(BigInt(pub.n), BigInt(pub.g));

  const SHIFT = 128n;
  const m = (1n << SHIFT);
  const c = publicKey.encrypt(m);
  let h = c.toString(16);
  if (h.length % 2 === 1) h = '0' + h;
  const hex = '0x' + h;

  const hre = require('hardhat');
  const [signer] = await hre.ethers.getSigners();
  console.log('Using signer', signer.address);

  const VOTING_ABI = ['function submitVote(bytes)', 'function getEncryptedVotes() view returns (bytes[])'];
  const contract = new hre.ethers.Contract(contractAddr, VOTING_ABI, signer);

  console.log('Submitting vote...');
  try {
    const tx = await contract.submitVote(hex);
    console.log('Submitted tx', tx.hash);
    await tx.wait();
    console.log('Tx mined');
  } catch (err) {
    console.log('SubmitVote failed (maybe already voted):', err && err.message ? err.message : err);
  }

  const provider = hre.ethers.provider;
  const withoutSigner = new hre.ethers.Contract(contractAddr, VOTING_ABI, provider);
  const enc = await withoutSigner.getEncryptedVotes();
  console.log('Encrypted votes stored count:', enc.length);

  const backend = process.env.BACKEND_URL || 'http://127.0.0.1:3001';
  const res = await (await fetch(new URL('/aggregate-and-finalize', backend).toString(), { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ contract: contractAddr }) })).text();
  console.log('Backend response:', res);
}

main().catch(e=>{ console.error(e); process.exitCode=1; });
