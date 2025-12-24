require('dotenv').config();
const fs = require('fs');
const Ethers = require('ethers');
const paillier = require('paillier-bigint');

async function main(){
  const provider = new Ethers.JsonRpcProvider(process.env.PROVIDER_URL || 'http://127.0.0.1:8545');
  const contractAddr = process.env.VOTING_CONTRACT_ADDRESS;
  const VOTING_ABI = ['function getEncryptedVotes() view returns (bytes[])'];
  const contract = new Ethers.Contract(contractAddr, VOTING_ABI, provider);
  const enc = await contract.getEncryptedVotes();
  console.log('got', enc.length, 'entries');

  const raw = JSON.parse(fs.readFileSync('.keys/paillier-key.json'));
  const pub = raw.publicKey;
  const priv = raw.privateKey;
  const publicKey = new paillier.PublicKey(BigInt(pub.n), BigInt(pub.g));
  const privateKey = new paillier.PrivateKey(BigInt(priv.lambda), BigInt(priv.mu), publicKey);

  const n2 = publicKey._n2;
  let aggregate = 1n;
  for (const b of enc) {
    const hex = Ethers.hexlify(b);
    console.log('hex sample start', hex.slice(0,20));
    const val = BigInt(hex);
    aggregate = (aggregate * val) % n2;
  }

  console.log('types before decrypt:', typeof aggregate, typeof publicKey._n2, typeof privateKey.lambda, typeof privateKey.mu);
  console.log('aggregate hex len', aggregate.toString(16).length);
  const plaintext = privateKey.decrypt(aggregate);
  console.log('plaintext', plaintext.toString());
}

main().catch(e=>{ console.error('ERR', e && e.stack ? e.stack : e); process.exit(1); });
