MaveriX Oracle dApp

MaveriX Oracle dApp is a Web3 dashboard for token treasury control, on-chain mint/burn management, and ETH price visibility, designed for DAO operators, founders, and treasurers.

Built on Sepolia, powered by Chainlink price feeds, and secured with owner-only controls.

✨ Features

🔐 Owner-Controlled Token Management

Mint and burn ERC-20 tokens

Owner-only access enforced on-chain and in UI

Owner badge displayed when connected

💰 Wallet & Balance Dashboard

Connect via MetaMask

View live token balance

Multi-token selector (MXT, WETH, WBTC)

📈 ETH/USD Price Oracle

Live ETH price (USD)

7-day ETH price chart

Powered by Chainlink & CoinGecko

🧾 Transaction History

Mint / Burn / Transfer logs

Gas usage tracking

Direct links to Sepolia Etherscan

🎨 Neon UI / Cyberpunk Theme

Framer Motion animations

TailwindCSS neon styling

Responsive dashboard layout

🧠 Intended Use Cases

DAO treasuries

Token issuers & founders

Governance-controlled supply management

Internal admin dashboards

Testnet simulations for token economics

🔒 Security Model

Token contract uses OpenZeppelin Ownable

Only the contract owner can:

Mint tokens

Burn tokens

UI automatically:

Detects contract owner

Disables mint/burn for non-owners

Displays owner badge

All critical permissions are enforced on-chain, not just in the UI.

🛠 Tech Stack

Frontend: React + TypeScript

Styling: TailwindCSS

Animations: Framer Motion

Blockchain: Ethereum (Sepolia)

Web3: Ethers v6

Oracles: Chainlink ETH/USD

Charts: Chart.js

Wallet: MetaMask

📦 Smart Contracts

MaveriX (MX / MXT)

ERC-20

Owner-controlled mint & burn

18 decimals

Deployed on Sepolia

🚀 Getting Started
git clone https://github.com/your-username/maverix-oracle-dapp.git
cd maverix-oracle-dapp
npm install
npm run dev


Make sure MetaMask is connected to Sepolia.

⚠️ Notes

Token price (USD) is optional and depends on CoinGecko availability

ETH price uses public oracle feeds

This project is currently optimized for testnet usage

📜 License

MIT
