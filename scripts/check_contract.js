require('dotenv').config();
const { JsonRpcProvider, Contract } = require('ethers');
const addr = process.argv[2] || process.env.VOTING_CONTRACT_ADDRESS || '0x0';
const providerUrl = process.env.PROVIDER_URL;
(async ()=>{
  try{
    if(!providerUrl) return console.error('PROVIDER_URL not set in .env');
    const p = new JsonRpcProvider(providerUrl);
    console.log('Checking address', addr, 'on', providerUrl);
    const code = await p.getCode(addr);
    console.log('codeLength', (code||'').length);
    if(!code || code === '0x') { console.log('No contract code at address'); return; }
    const abi=['function startTime() view returns (uint256)', 'function endTime() view returns (uint256)', 'function owner() view returns (address)'];
    const c = new Contract(addr, abi, p);
    const start = await c.startTime();
    const end = await c.endTime();
    const owner = await c.owner();
    console.log('startTime', start.toString(), 'endTime', end.toString(), 'owner', owner);
  }catch(e){
    console.error('ERR', e && e.message ? e.message : e);
  }
})();
