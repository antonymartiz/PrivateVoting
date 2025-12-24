require('dotenv').config();
const fs = require('fs');
const paillier = require('paillier-bigint');
const Ethers = require('ethers');

async function main(){
  const providerUrl = process.env.PROVIDER_URL || 'http://127.0.0.1:8545';
  const contractAddr = process.argv[2] || process.env.VOTING_CONTRACT_ADDRESS;
  if (!contractAddr) throw new Error('contract address required as arg or VOTING_CONTRACT_ADDRESS env');

  const provider = new Ethers.JsonRpcProvider(providerUrl);
  const VOTING_ABI = ['function getEncryptedVotes() view returns (bytes[])', 'function finalizeTally(uint256,uint256)'];
  const contract = new Ethers.Contract(contractAddr, VOTING_ABI, provider);

  const encrypted = await contract.getEncryptedVotes();
  if (!encrypted || encrypted.length === 0) return console.log(JSON.stringify({ message: 'no votes' }));

  const raw = JSON.parse(fs.readFileSync('.keys/paillier-key.json'));
  const pub = raw.publicKey;
  const priv = raw.privateKey;
  const publicKey = new paillier.PublicKey(BigInt(pub.n), BigInt(pub.g));
  const privateKey = new paillier.PrivateKey(BigInt(priv.lambda), BigInt(priv.mu), publicKey);

  const n2 = publicKey._n2;
  let aggregate = 1n;
  for (const b of encrypted) {
    const hex = Ethers.hexlify(b);
    const val = BigInt(hex);
    aggregate = (aggregate * val) % n2;
  }

  const plaintext = privateKey.decrypt(aggregate);
  const SHIFT = 128n;
  const MASK = (1n << SHIFT) - 1n;
  const forVotes = plaintext >> SHIFT;
  const againstVotes = plaintext & MASK;

  // finalize on-chain
  const signer = new Ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contractWithSigner = new Ethers.Contract(contractAddr, VOTING_ABI, signer);
  const tx = await contractWithSigner.finalizeTally(forVotes.toString(), againstVotes.toString());
  await tx.wait();

  console.log(JSON.stringify({ forVotes: forVotes.toString(), againstVotes: againstVotes.toString(), tx: tx.hash }));
}

main().catch(e=>{ console.error(e && e.stack ? e.stack : e); process.exit(1); });
