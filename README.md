# Private Voting Demo (Paillier homomorphic encryption)

This demo shows a simple private voting flow using Paillier homomorphic encryption:

- Voters encrypt a packed vote on the frontend (local encryption) and submit ciphertexts to a smart contract.
- The contract stores encrypted votes and enforces one-vote-per-address eligibility (checks token balance > 0).
- A backend service aggregates ciphertexts and decrypts the final tally using the private key, then writes the final tally on-chain.

Important: This is a demo/proof-of-concept. Do NOT use the generated keys or this code in production.

Quick setup
1. Install dependencies (run in project root):

```bash
npm install
npm install paillier-bigint ethers express cors dotenv
```

2. Generate keys:

```bash
node scripts/keygen.js
```

3. Configure `.env` (create file in project root):

```
PROVIDER_URL=http://localhost:8545
PORT=3001
PRIVATE_KEY=0x...
VOTING_CONTRACT_ADDRESS=0x...
```

4. Start backend:

```bash
node backend/server.js
```

5. Serve frontend `frontend/public` (e.g., `npx serve frontend/public`), open in browser and connect MetaMask.

Notes
- The smart contract is `contracts/PrivateVoting.sol` — compile and deploy via Hardhat as usual.
- The frontend encrypts votes locally using the public key fetched from the backend at `/publicKey`.
- The backend endpoint `/aggregate-and-finalize` aggregates ciphertexts from the contract, decrypts, and calls `finalizeTally`.

Encoding scheme
- Votes are encoded as a packed integer: high 128 bits = total "for" weight, low 128 bits = total "against" weight.

Security
- This demo is educational. Key management, secure eligibility proofs (ZK), preventing balance leaks, and production-grade key sizes are outside the scope of this example.
# FHEVM Hardhat Template

A Hardhat-based template for developing Fully Homomorphic Encryption (FHE) enabled Solidity smart contracts using the
FHEVM protocol by Zama.

## Quick Start

For detailed instructions see:
[FHEVM Hardhat Quick Start Tutorial](https://docs.zama.ai/protocol/solidity-guides/getting-started/quick-start-tutorial)

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm or yarn/pnpm**: Package manager

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   ```bash
   npx hardhat vars set MNEMONIC

   # Set your Infura API key for network access
   npx hardhat vars set INFURA_API_KEY

   # Optional: Set Etherscan API key for contract verification
   npx hardhat vars set ETHERSCAN_API_KEY
   ```

3. **Compile and test**

   ```bash
   npm run compile
   npm run test
   ```

4. **Deploy to local network**

   ```bash
   # Start a local FHEVM-ready node
   npx hardhat node
   # Deploy to local network
   npx hardhat deploy --network localhost
   ```

5. **Deploy to Sepolia Testnet**

   ```bash
   # Deploy to Sepolia
   npx hardhat deploy --network sepolia
   # Verify contract on Etherscan
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
   ```

6. **Test on Sepolia Testnet**

   ```bash
   # Once deployed, you can run a simple test on Sepolia.
   npx hardhat test --network sepolia
   ```

## 📁 Project Structure

```
fhevm-hardhat-template/
├── contracts/           # Smart contract source files
│   └── FHECounter.sol   # Example FHE counter contract
├── deploy/              # Deployment scripts
├── tasks/               # Hardhat custom tasks
├── test/                # Test files
├── hardhat.config.ts    # Hardhat configuration
└── package.json         # Dependencies and scripts
```

## 📜 Available Scripts

| Script             | Description              |
| ------------------ | ------------------------ |
| `npm run compile`  | Compile all contracts    |
| `npm run test`     | Run all tests            |
| `npm run coverage` | Generate coverage report |
| `npm run lint`     | Run linting checks       |
| `npm run clean`    | Clean build artifacts    |

## 📚 Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Setup Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [FHEVM Testing Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat/write_test)
- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/zama-ai/fhevm/issues)
- **Documentation**: [FHEVM Docs](https://docs.zama.ai)
- **Community**: [Zama Discord](https://discord.gg/zama)

---

**Built with ❤️ by the Zama team**
