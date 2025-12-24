require('dotenv').config();
const express = require('express');
const fs = require('fs');
const paillierBigint = require('paillier-bigint');
const Ethers = require('ethers');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const KEY_PATH = '.keys/paillier-key.json';
if (!fs.existsSync(KEY_PATH)) {
  console.warn('No keypair found at .keys/paillier-key.json – run `node scripts/keygen.js`');
}

const PROVIDER_URL = process.env.PROVIDER_URL || 'http://localhost:8545';
const CONTRACT_ADDRESS = process.env.VOTING_CONTRACT_ADDRESS || '';
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || '';

if (!process.env.PRIVATE_KEY) {
  console.warn('Warning: PRIVATE_KEY not set in .env — finalize endpoint will fail without it.');
}

let provider;
try {
  provider = new Ethers.JsonRpcProvider(PROVIDER_URL);
} catch (e) {
  console.warn('Invalid PROVIDER_URL, falling back to default provider:', e && e.message ? e.message : e);
  try { provider = Ethers.getDefaultProvider('sepolia'); } catch (err) { provider = null; }
}

const VOTING_ABI = [
  'function getEncryptedVotes() view returns (bytes[])',
  'function finalizeTally(uint256,uint256)'
];

app.get('/publicKey', async (req, res) => {
  console.log('GET /publicKey');
  if (!fs.existsSync(KEY_PATH)) {
    console.warn('publicKey requested but key file missing');
    return res.status(404).send({ error: 'no keypair' });
  }
  try {
    const raw = JSON.parse(fs.readFileSync(KEY_PATH));
    console.log('Serving public key, n length:', raw.publicKey && raw.publicKey.n ? raw.publicKey.n.length : 'unknown');
    return res.send({ publicKey: raw.publicKey });
  } catch (err) {
    console.error('Failed to read/parse key file', err.message || err);
    return res.status(500).send({ error: 'invalid key file' });
  }
});

app.get('/health', (req, res) => {
  const ok = fs.existsSync(KEY_PATH);
  res.json({ ok: true, keyPresent: ok });
});

// Expose simple runtime config for frontend convenience
app.get('/config', (req, res) => {
  res.json({ votingContractAddress: CONTRACT_ADDRESS || null, providerUrl: PROVIDER_URL || null });
});

app.post('/aggregate-and-finalize', async (req, res) => {
  // allow optional override of contract address in request body
  const contractAddr = (req.body && req.body.contract) ? req.body.contract : CONTRACT_ADDRESS;
  if (!contractAddr || !/^0x[0-9a-fA-F]{40}$/.test(contractAddr)) return res.status(400).send({ error: 'invalid or missing contract address' });
  if (!fs.existsSync(KEY_PATH)) return res.status(500).send({ error: 'keypair missing' });
  if (!process.env.PRIVATE_KEY) return res.status(500).send({ error: 'PRIVATE_KEY not set on server' });

  const raw = JSON.parse(fs.readFileSync(KEY_PATH));
  const pub = raw.publicKey;
  const priv = raw.privateKey;

  const publicKey = new paillierBigint.PublicKey(BigInt(pub.n), BigInt(pub.g));
  const privateKey = new paillierBigint.PrivateKey(BigInt(priv.lambda), BigInt(priv.mu), publicKey);

  const contract = new Ethers.Contract(contractAddr, VOTING_ABI, provider);
  let encrypted;
  try {
    console.log('Fetching contract code at', contractAddr);
    let code = null;
    if (provider) {
      try { code = await provider.getCode(contractAddr); } catch (e) { code = null; }
    }
    // if no code found with configured provider, try public Sepolia RPC and Infura (if key present)
    if (!code || code === '0x') {
      try {
        const fallback = new Ethers.JsonRpcProvider('https://rpc.sepolia.org');
        const fbCode = await fallback.getCode(contractAddr);
        if (fbCode && fbCode !== '0x') { provider = fallback; code = fbCode; }
      } catch (e) { /* ignore fallback error */ }
    }
    if ((!code || code === '0x') && process.env.INFURA_API_KEY) {
      try {
        const infuraUrl = `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`;
        const infura = new Ethers.JsonRpcProvider(infuraUrl);
        const iCode = await infura.getCode(contractAddr);
        if (iCode && iCode !== '0x') { provider = infura; code = iCode; }
      } catch (e) { /* ignore */ }
    }

    console.log('Contract code length:', (code || '').length);
    if (!code || code === '0x') {
      console.error('No contract deployed at address', contractAddr);
      return res.status(400).send({ error: 'no contract at address' });
    }

    // create contract with the provider we resolved
    const contractWithProvider = new Ethers.Contract(contractAddr, VOTING_ABI, provider);
    encrypted = await contractWithProvider.getEncryptedVotes();
  } catch (err) {
    console.error('Error fetching encrypted votes:', err && err.stack ? err.stack : err);
    const msg = (err && err.message) ? err.message : String(err);
    return res.status(500).send({ error: 'failed to fetch encrypted votes', details: msg });
  }

  if (!encrypted || encrypted.length === 0) return res.status(200).send({ message: 'no votes' });

  const n2 = publicKey._n2;
  // aggregate by multiplying ciphertexts mod n^2
  let aggregate = 1n;
  for (const b of encrypted) {
    try {
      // b is bytes; convert to BigInt
      const hex = Ethers.hexlify(b);
      const val = BigInt(hex);
      aggregate = (aggregate * val) % n2;
    } catch (err) {
      console.warn('Skipping invalid ciphertext entry', err.message || err);
    }
  }

  try {
    // To avoid potential module-state issues, run decryption/finalization in a child process
    const { spawn } = require('child_process');
    const child = spawn(process.execPath, ['scripts/aggregate_and_finalize_child.js', contractAddr], { env: process.env });
    let out = '';
    let errOut = '';
    child.stdout.on('data', (d) => out += d.toString());
    child.stderr.on('data', (d) => errOut += d.toString());
    child.on('close', (code) => {
      if (code !== 0) {
        console.error('Child finalize error:', errOut || out);
        return res.status(500).send({ error: 'child finalize failed', details: errOut || out });
      }
      try {
        const j = JSON.parse(out);
        return res.send(j);
      } catch (e) {
        return res.status(500).send({ error: 'invalid child response', details: out });
      }
    });
    return; // response will be sent from child callback
  } catch (err) {
    console.error('Error during decrypt/aggregate handling:', err && err.stack ? err.stack : err);
    return res.status(500).send({ error: 'decryption error', details: String(err) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('Backend running on port', PORT);
});
