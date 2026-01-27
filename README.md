🧠 MaveriX Oracle dApp

A simple React-based decentralized application (dApp) that integrates with Chainlink’s ETH/USD price feed on the Sepolia testnet. Users can view the current ETH price, connect their wallet, and interact with a token smart contract (mint, transfer, burn).

🚀 Features

📈 Fetches ETH/USD price using Chainlink price feed

🔗 Uses ethers.js for smart contract interaction

👛 Wallet connection via MetaMask

🪙 Token functionality: mint, transfer, burn

💾 Transaction history saved locally

🛠 Tech Stack

Frontend: React + Vite

Blockchain: Ethereum (Sepolia)

Smart Contract Interaction: ethers.js

Oracle: Chainlink Price Feeds

📦 Setup & Run Locally

Clone repo

git clone https://github.com/yourusername/your-repo-name.git
cd your-repo-name


Install dependencies

npm install


Run dev server

npm run dev


Open in browser: http://localhost:5173

📡 Chainlink Price Feed

Uses this contract:

ETH/USD Aggregator
0x694AA1769357215DE4FAC081bf1f309aDC325306 (Sepolia)

🧪 Contract ABI Used
[
  "function latestAnswer() view returns (int256)"
]

👤 Author
Michael K.
el-Mavericko
