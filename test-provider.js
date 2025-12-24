// test-provider.js
import { JsonRpcProvider } from 'ethers';
const p = new JsonRpcProvider('https://sepolia.infura.io/v3/2863c019362e4610a8626d7eeed702c1');
(async ()=> {
  console.log(await p.getBlockNumber());
})();