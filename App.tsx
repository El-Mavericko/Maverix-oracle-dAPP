// App.tsx
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import './index.css';

interface Transaction {
  type: string;
  amount: string;
  to: string;
  txHash: string;
  gasUsed: string;
  timestamp: string;
}

const tokenAddress = "0x8ec06564305BF5624a784d943572Bc1A0ccB8166";
const tokenABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function burn(address from, uint256 amount)"
];

const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const priceFeedABI = [
  "function latestAnswer() view returns (int256)"
];

declare global {
  interface Window {
    ethereum?: any;
  }
}

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState<string>("");
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [tokenBalance, setTokenBalance] = useState<string>("");
  const [ethPrice, setEthPrice] = useState<string>("Loading...");
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [mintAmount, setMintAmount] = useState<string>("");
  const [burnAmount, setBurnAmount] = useState<string>("");
  const [txHistory, setTxHistory] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("txHistory");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("txHistory", JSON.stringify(txHistory));
  }, [txHistory]);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("MetaMask is not installed.");
    try {
      const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      const userAccount = accounts[0];
      setAccount(userAccount);
      await loadTokenData(userAccount);
      await loadETHPrice();
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  const loadTokenData = async (userAddress: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(tokenAddress, tokenABI, signer);
      const name = await contract.name();
      const symbol = await contract.symbol();
      const balance = await contract.balanceOf(userAddress);
      setTokenName(name);
      setTokenSymbol(symbol);
      setTokenBalance(ethers.formatUnits(balance, 18));
    } catch (error) {
      console.error("Failed to read token data:", error);
    }
  };

  const loadETHPrice = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const priceFeed = new ethers.Contract(priceFeedAddress, priceFeedABI, provider);
      const price = await priceFeed.latestAnswer();
      setEthPrice(`$${(Number(price) / 1e8).toFixed(2)}`);
    } catch (error) {
      console.error("Failed to fetch ETH price:", error);
      setEthPrice("Error");
    }
  };

  const addToHistory = (type: string, amount: string, to: string, txHash: string, gasUsed: string) => {
    const newEntry: Transaction = {
      type, amount, to, txHash, gasUsed,
      timestamp: new Date().toLocaleTimeString()
    };
    setTxHistory((prev) => [newEntry, ...prev]);
  };

  const transferTokens = async () => {
    if (!recipient || !amount) return alert("Please enter recipient and amount.");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(tokenAddress, tokenABI, signer);
      const tx = await contract.transfer(recipient, ethers.parseUnits(amount, 18));
      const receipt = await tx.wait();
      alert(`Transfer successful! Hash: ${tx.hash}`);
      addToHistory("Transfer", amount, recipient, tx.hash, receipt.gasUsed.toString());
      await loadTokenData(account!);
    } catch (error) {
      console.error("Transfer failed:", error);
    }
  };

  const mintTokens = async () => {
    if (!mintAmount) return alert("Enter mint amount");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(tokenAddress, tokenABI, signer);
      const tx = await contract.mint(account, ethers.parseUnits(mintAmount, 18));
      const receipt = await tx.wait();
      alert(`Minted ${mintAmount} ${tokenSymbol}`);
      addToHistory("Mint", mintAmount, account!, tx.hash, receipt.gasUsed.toString());
      await loadTokenData(account!);
    } catch (error) {
      console.error("Mint failed:", error);
    }
  };

  const burnTokens = async () => {
    if (!burnAmount) return alert("Enter burn amount");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(tokenAddress, tokenABI, signer);
      const tx = await contract.burn(account, ethers.parseUnits(burnAmount, 18));
      const receipt = await tx.wait();
      alert(`Burned ${burnAmount} ${tokenSymbol}`);
      addToHistory("Burn", burnAmount, account!, tx.hash, receipt.gasUsed.toString());
      await loadTokenData(account!);
    } catch (error) {
      console.error("Burn failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-blue-400 tracking-wide">MaveriX Oracle dApp</h1>
          <p className="text-gray-400 text-lg mt-2">Powered by Chainlink • Sepolia Testnet</p>
          <span className="inline-block bg-green-800 text-green-300 text-sm px-4 py-1 rounded-full mt-4">
            ETH/USD Price: {ethPrice}
          </span>
        </div>

        {!account ? (
          <div className="flex justify-center">
            <button onClick={connectWallet} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold">
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg space-y-2">
              <p><strong>Wallet:</strong> {account}</p>
              <p><strong>Token:</strong> {tokenName} ({tokenSymbol})</p>
              <p><strong>Balance:</strong> {tokenBalance} {tokenSymbol}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold mb-4">Send Tokens</h3>
                <input
                  type="text"
                  placeholder="Recipient Address"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded mb-4"
                />
                <input
                  type="text"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded mb-4"
                />
                <button
                  onClick={transferTokens}
                  className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded w-full"
                >
                  Send
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-800 p-6 rounded-xl shadow-md">
                  <h3 className="text-xl font-semibold mb-4">Mint Tokens</h3>
                  <input
                    type="text"
                    placeholder="Amount to Mint"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded mb-4"
                  />
                  <button
                    onClick={mintTokens}
                    className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded w-full"
                  >
                    Mint
                  </button>
                </div>

                <div className="bg-gray-800 p-6 rounded-xl shadow-md">
                  <h3 className="text-xl font-semibold mb-4">Burn Tokens</h3>
                  <input
                    type="text"
                    placeholder="Amount to Burn"
                    value={burnAmount}
                    onChange={(e) => setBurnAmount(e.target.value)}
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded mb-4"
                  />
                  <button
                    onClick={burnTokens}
                    className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded w-full"
                  >
                    Burn
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
              {txHistory.length === 0 ? (
                <p className="text-gray-400">No transactions yet.</p>
              ) : (
                <ul className="space-y-4 max-h-96 overflow-y-auto">
                  {txHistory.map((tx, index) => (
                    <li key={index} className="bg-gray-900 p-4 rounded border border-gray-700">
                      <div className="text-sm">
                        <span className="text-yellow-400">[{tx.timestamp}]</span>
                        <span className={`ml-2 text-xs px-2 py-1 rounded-full font-semibold ${
                          tx.type === 'Transfer' ? 'bg-green-700 text-green-200' :
                          tx.type === 'Mint' ? 'bg-purple-700 text-purple-200' :
                          'bg-red-700 text-red-200'
                        }`}>
                          {tx.type}
                        </span>
                        <div className="mt-2">
                          {tx.amount} to {tx.to}
                        </div>
                        <div>
                          TX: <a href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noreferrer" className="text-blue-400 underline">
                            {tx.txHash}
                          </a>
                        </div>
                        <div className="text-gray-400">Gas Used: {tx.gasUsed}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
