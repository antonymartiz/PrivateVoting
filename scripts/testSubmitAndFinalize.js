const fs = require('fs');
require('dotenv').config();
const paillier = require('paillier-bigint');
const Ethers = require('ethers');
const fetch = (...args) => import('node-fetch').then(({default:fetch})=>fetch(...args));

async function main(){
  const ENV = process.env;
  const providerUrl = ENV.PROVIDER_URL || 'http://127.0.0.1:8545';
  const privateKey = (ENV.PRIVATE_KEY || '').replace(/"/g,'');
  const contractAddr = (ENV.VOTING_CONTRACT_ADDRESS || '').replace(/"/g,'');
  if (!privateKey) throw new Error('PRIVATE_KEY not set in env');
  if (!contractAddr) throw new Error('VOTING_CONTRACT_ADDRESS not set in env');

  const raw = JSON.parse(fs.readFileSync('.keys/paillier-key.json'));
  const pub = raw.publicKey;
  const publicKey = new paillier.PublicKey(BigInt(pub.n), BigInt(pub.g));

  // encode a small vote: forVotes = 1, against = 0 -> packed = (1 << 128)
  const SHIFT = 128n;
  const m = (1n << SHIFT);
  const c = publicKey.encrypt(m);
  const hex = '0x' + c.toString(16);

  const provider = new Ethers.JsonRpcProvider(providerUrl);
  let signer;
  if (/^0x[0-9a-fA-F]{40}$/.test(privateKey)) {
    // env contains an address instead of a private key; use node's unlocked account via provider
    signer = provider.getSigner(0);
  } else {
    signer = new Ethers.Wallet(privateKey, provider);
  }
  const VOTING_ABI = ['function submitVote(bytes)', 'function getEncryptedVotes() view returns (bytes[])'];
  const contract = new Ethers.Contract(contractAddr, VOTING_ABI, signer);

  console.log('Submitting vote to', contractAddr);
  const tx = await contract.submitVote(hex);
  console.log('Submitted tx', tx.hash);
  await tx.wait();
  console.log('Tx mined');

  // verify stored
  const withoutSigner = new Ethers.Contract(contractAddr, VOTING_ABI, provider);
  const enc = await withoutSigner.getEncryptedVotes();
  console.log('Encrypted votes stored count:', enc.length);

  // call backend finalize
  const backend = ENV.BACKEND_URL || 'http://127.0.0.1:3001';
  const res = await fetch(new URL('/aggregate-and-finalize', backend).toString(), { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ contract: contractAddr }) });
  const text = await res.text();
  console.log('Backend response status', res.status);
  console.log('Backend body:', text);
}

main().catch(e=>{ console.error(e); process.exitCode=1; });
