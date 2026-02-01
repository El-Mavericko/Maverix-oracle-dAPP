🧠 MaveriX Oracle dApp

A professional-grade decentralized application (dApp) built with React, TypeScript, and ethers.js, integrating Chainlink Price Feeds to deliver real-time ETH/USD data on the Sepolia testnet.

Designed with scalability, clean architecture, and modern UI principles, MaveriX demonstrates full-stack Web3 capability — from oracle consumption to token interaction.

🚀 Overview

MaveriX Oracle dApp provides a sleek, responsive interface that allows users to connect their wallet, monitor live ETH prices, and interact directly with an ERC-20 token contract.

This project emphasizes:

Production-style frontend architecture

Type-safe blockchain interaction

Clean UI/UX design

Modular, scalable code practices

✨ Core Features
📊 Live Oracle Data

Fetches ETH/USD price in real time using Chainlink

Runs on Sepolia testnet

Reliable off-chain data delivered on-chain

👛 Wallet Integration

Secure MetaMask connection

Automatic wallet detection

Real-time account display

🪙 Token Interaction

Full ERC-20 style functionality:

✅ Mint tokens

✅ Transfer tokens

✅ Burn tokens

✅ View live balances

All transactions are executed directly on-chain via ethers.js.

📜 Smart Transaction History

Timestamped activity log

Gas usage visibility

Direct links to Etherscan

Color-coded transaction types (Mint / Transfer / Burn)

🎨 Modern Professional UI

Dark, gradient-based layout

Glass-style card components

Responsive design for multiple screen sizes

Clean visual hierarchy

🔐 TypeScript-Powered

The entire frontend has been upgraded from JavaScript to TypeScript, improving:

Reliability

Maintainability

Developer experience

Long-term scalability

🛠 Tech Stack

Frontend

React

TypeScript

Vite

Tailwind CSS

Blockchain

Ethereum (Sepolia Testnet)

ethers.js

Oracle

Chainlink Price Feeds

📡 Chainlink Integration

ETH/USD Aggregator (Sepolia):

0x694AA1769357215DE4FAC081bf1f309aDC325306


ABI Used:

function latestAnswer() view returns (int256)

📦 Setup & Run Locally
1️⃣ Clone the repository
git clone https://github.com/yourusername/your-repo-name.git
cd your-repo-name

2️⃣ Install dependencies
npm install

3️⃣ Start the development server
npm run dev


Open:

http://localhost:5173

🧠 Architecture Philosophy

MaveriX was built with a forward-looking mindset:

Clean code. Strong typing. Scalable structure. Professional UX.

This is not just a demo — it is a foundation capable of evolving into a production-ready Web3 application.

🔮 Future Enhancements

Component-based architecture

Toast notifications & loading states

Smart contract event listeners

Multi-network support

Admin-controlled oracle dashboard

Deployment to Vercel

Advanced analytics

👤 Author

Michael K. el-Mavericko

Web3 builder focused on infrastructure, intelligent systems, and high-performance decentralized applications.
