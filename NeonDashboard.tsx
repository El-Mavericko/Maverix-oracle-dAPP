import { motion } from "framer-motion";
import { Line } from "react-chartjs-2";
import React from 'react';

interface Props {
  tokens: Record<string, any>;
  account: string | null;
  tokenBalance: string;
  token: any;
  ethPrice: string;
  tokenPriceUsd: string;
  ethChartLabels: string[];
  ethChartData: number[];
  txHistory: any[];
  connectWallet: () => void;
  transferTokens: () => void;
  mintTokens: () => void;
  burnTokens: () => void;
  recipient: string;
  setRecipient: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  mintAmount: string;
  setMintAmount: (v: string) => void;
  burnAmount: string;
  setBurnAmount: (v: string) => void;
  tokenKey: string;
  setTokenKey: (v: string) => void;
}

const NeonDashboard: React.FC<Props> = ({
  tokens,
  account,
  tokenBalance,
  token,
  ethPrice,
  tokenPriceUsd,
  ethChartLabels,
  ethChartData,
  txHistory,
  connectWallet,
  transferTokens,
  mintTokens,
  burnTokens,
  recipient,
  setRecipient,
  amount,
  setAmount,
  mintAmount,
  setMintAmount,
  burnAmount,
  setBurnAmount,
  tokenKey,
  setTokenKey,
}) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="min-h-screen bg-dark-bg text-white p-6 md:p-10 font-orbitron">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <motion.div className="text-6xl text-center text-white animate-pulse">💀</motion.div>
          <motion.div className="text-center">
            <h1 className="text-4xl font-bold text-neon-blue">MaveriX Oracle dApp</h1>
            <p className="text-neon-pink">Chainlink | Sepolia | Token Control</p>
          </motion.div>

          <div className="flex justify-center gap-4">
            {Object.entries(tokens).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setTokenKey(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${tokenKey === key ? "border-neon-blue bg-dark-card" : "border-dark-border bg-gray-900"}`}
              >
                <img src={info.logo} alt={info.symbol} className="w-6 h-6" />
                <span>{info.symbol}</span>
              </button>
            ))}
          </div>

          <div className="text-center space-y-1 text-neon-blue">
            <p><strong>Token Price (USD):</strong> {tokenPriceUsd}</p>
            <p><strong>ETH/USD:</strong> {ethPrice}</p>
          </div>

          {account && ethChartData.length > 0 && (
            <div className="bg-dark-card p-4 rounded-xl mt-4 border border-dark-border shadow-[0_0_10px_#00ffff66]">
              <h3 className="text-lg font-semibold mb-2">ETH Price - Last 7 Days</h3>
              <Line
                data={{
                  labels: ethChartLabels,
                  datasets: [
                    {
                      label: "ETH/USD",
                      data: ethChartData,
                      borderColor: "rgba(59, 130, 246, 1)",
                      backgroundColor: "rgba(59, 130, 246, 0.2)",
                      tension: 0.3,
                      fill: true,
                    },
                  ],
                }}
              />
            </div>
          )}

          {!account ? (
            <div className="text-center">
              <button
                onClick={connectWallet}
                className="bg-neon-blue hover:bg-blue-500 px-6 py-3 rounded-lg font-semibold text-black"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-dark-card p-4 rounded-xl border border-dark-border">
                <p><strong>Wallet:</strong> {account}</p>
                <p><strong>Balance:</strong> {tokenBalance} {token.symbol}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-dark-card p-4 rounded-xl border border-dark-border">
                  <h3 className="text-xl font-semibold mb-2">Send Tokens</h3>
                  <input type="text" placeholder="Recipient Address" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full p-2 mb-2 rounded bg-gray-900 border border-gray-700" />
                  <input type="text" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 mb-2 rounded bg-gray-900 border border-gray-700" />
                  <button onClick={transferTokens} className="w-full bg-neon-blue hover:bg-blue-500 text-black font-semibold px-4 py-2 rounded">Send</button>
                </div>
                <div className="space-y-6">
                  <div className="bg-dark-card p-4 rounded-xl border border-dark-border">
                    <h3 className="text-xl font-semibold mb-2">Mint Tokens</h3>
                    <input type="text" placeholder="Amount to Mint" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} className="w-full p-2 mb-2 rounded bg-gray-900 border border-gray-700" />
                    <button onClick={mintTokens} className="w-full bg-neon-purple hover:bg-purple-500 text-black font-semibold px-4 py-2 rounded">Mint</button>
                  </div>
                  <div className="bg-dark-card p-4 rounded-xl border border-dark-border">
                    <h3 className="text-xl font-semibold mb-2">Burn Tokens</h3>
                    <input type="text" placeholder="Amount to Burn" value={burnAmount} onChange={(e) => setBurnAmount(e.target.value)} className="w-full p-2 mb-2 rounded bg-gray-900 border border-gray-700" />
                    <button onClick={burnTokens} className="w-full bg-neon-pink hover:bg-pink-500 text-black font-semibold px-4 py-2 rounded">Burn</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Dashboard: Transaction History */}
        <div className="bg-dark-card border border-dark-border p-4 rounded-xl shadow-[0_0_15px_#ff00ff66] overflow-y-auto">
          <h3 className="text-xl font-semibold text-neon-pink mb-4">Transaction History</h3>
          {txHistory.length === 0 ? (
            <p className="text-gray-400">No transactions yet.</p>
          ) : (
            <ul className="space-y-4">
              {txHistory.map((tx, index) => (
                <motion.li key={index} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="bg-gray-900 p-4 rounded border border-gray-700">
                  <div className="text-sm">
                    <span className="text-yellow-400">[{tx.timestamp}]</span>
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full font-semibold ${
                      tx.type === 'Transfer' ? 'bg-green-700 text-green-200' :
                      tx.type === 'Mint' ? 'bg-purple-700 text-purple-200' :
                      'bg-red-700 text-red-200'
                    }`}>
                      {tx.type}
                    </span>
                    <div className="mt-2">{tx.amount} to {tx.to}</div>
                    <div>
                      TX: <a href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noreferrer" className="text-blue-400 underline">{tx.txHash}</a>
                    </div>
                    <div className="text-gray-400">Gas Used: {tx.gasUsed}</div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default NeonDashboard;
