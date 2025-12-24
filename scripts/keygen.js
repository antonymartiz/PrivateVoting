const fs = require('fs');
const paillierBigint = require('paillier-bigint');

async function main() {
  console.log('Generating Paillier keypair (demo, small primes => not secure for production)');
  const { publicKey, privateKey } = await paillierBigint.generateRandomKeys(512);

  const out = {
    publicKey: { n: publicKey.n.toString(), g: publicKey.g.toString(), _n2: publicKey._n2.toString() },
    privateKey: { lambda: privateKey.lambda.toString(), mu: privateKey.mu.toString() }
  };

  if (!fs.existsSync('.keys')) fs.mkdirSync('.keys');
  fs.writeFileSync('.keys/paillier-key.json', JSON.stringify(out, null, 2));
  console.log('Saved key to .keys/paillier-key.json');
}

main().catch(err => { console.error(err); process.exit(1); });
