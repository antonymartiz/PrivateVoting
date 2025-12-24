const fs = require('fs');
const paillier = require('paillier-bigint');

async function main(){
  const raw = JSON.parse(fs.readFileSync('.keys/paillier-key.json'));
  const pub = raw.publicKey;
  const priv = raw.privateKey;
  const publicKey = new paillier.PublicKey(BigInt(pub.n), BigInt(pub.g));
  const privateKey = new paillier.PrivateKey(BigInt(priv.lambda), BigInt(priv.mu), publicKey);
  console.log('constructed keys types: ', typeof publicKey.n, typeof publicKey.g, typeof publicKey._n2);
  const m = 123n;
  const c = publicKey.encrypt(m);
  console.log('encrypted sample len hex', c.toString(16).length);
  try{
    const p = privateKey.decrypt(c);
    console.log('decrypted sample:', p.toString());
  }catch(e){
    console.error('decrypt error', e);
  }
}

main();
