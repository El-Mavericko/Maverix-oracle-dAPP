import { motion, AnimatePresence } from "framer-motion";
import { Line, Doughnut } from "react-chartjs-2";
import { QRCodeSVG } from "qrcode.react";
import React, { useState, useEffect } from 'react';
import type { TokenInfo, Transaction, PendingTx, FormErrors, GasEstimates } from "./App";

interface ChartConfig { coingeckoId: string; label: string; color: string; }

interface Props {
  tokens: Record<string, TokenInfo>;
  account: string | null;
  balances: Record<string, string>;
  ethBalance: string | null;
  tokenBalance: string | undefined;
  token: TokenInfo;
  tokenKey: string;
  setTokenKey: (v: string) => void;
  tokenPriceUsd: string;
  portfolioValue: number;
  donutData: any;
  chartLabels: string[];
  chartData: number[];
  chartConfig: ChartConfig;
  txHistory: Transaction[];
  pendingTxs: PendingTx[];
  loading: boolean;
  chainId: number | null;
  switchToSepolia: () => void;
  pricesRefreshing: boolean;
  refreshPrices: () => void;
  formErrors: FormErrors;
  gasEstimates: GasEstimates;
  ensResolved: string | null;
  ensResolving: boolean;
  memo: string;
  setMemo: (v: string) => void;
  connectWallet: () => void;
  disconnectWallet: () => void;
  clearHistory: () => void;
  exportCSV: () => void;
  transferTokens: () => void;
  mintTokens: () => void;
  burnTokens: () => void;
  approveTokens: () => void;
  addCustomToken: (addr: string) => void;
  recipient: string;
  setRecipient: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  mintAmount: string;
  setMintAmount: (v: string) => void;
  burnAmount: string;
  setBurnAmount: (v: string) => void;
  spenderAddr: string;
  setSpenderAddr: (v: string) => void;
  approveAmount: string;
  setApproveAmount: (v: string) => void;
  currentAllowance: string | null;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function truncate(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function useCountUp(target: number, duration = 1200) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setDisplay(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) requestAnimationFrame(step); else setDisplay(target);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return display;
}

const TX_ICON: Record<string, string> = { Transfer: "→", Mint: "✦", Burn: "🔥", Approve: "✓" };

const Skeleton = ({ w = "w-14" }: { w?: string }) => (
  <span className={`inline-block ${w} h-3 bg-gray-700 rounded animate-pulse`} />
);

const FieldError = ({ msg }: { msg: string }) =>
  msg ? <p className="text-red-400 text-xs mt-1">{msg}</p> : null;

const GasHint = ({ est }: { est: string | null }) =>
  est ? <p className="text-xs text-gray-500 text-center mt-1.5">Est. gas: <span className="text-neon-blue">{est}</span></p> : null;

const crosshairPlugin = {
  id: "crosshair",
  afterDraw(chart: any) {
    if (!chart.tooltip._active?.length) return;
    const ctx = chart.ctx;
    const x   = chart.tooltip._active[0].element.x;
    const { top, bottom } = chart.chartArea;
    ctx.save(); ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom);
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(0,255,255,0.4)"; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.restore();
  },
};

const SEPOLIA_ID = 11155111;

// ── component ──────────────────────────────────────────────────────────────────

const NeonDashboard: React.FC<Props> = ({
  tokens, account, balances, ethBalance, tokenBalance, token, tokenKey, setTokenKey,
  tokenPriceUsd, portfolioValue, donutData, chartLabels, chartData, chartConfig,
  txHistory, pendingTxs, loading,
  chainId, switchToSepolia, pricesRefreshing, refreshPrices,
  formErrors, gasEstimates, ensResolved, ensResolving, memo, setMemo,
  connectWallet, disconnectWallet, clearHistory, exportCSV,
  transferTokens, mintTokens, burnTokens, approveTokens, addCustomToken,
  recipient, setRecipient, amount, setAmount,
  mintAmount, setMintAmount, burnAmount, setBurnAmount,
  spenderAddr, setSpenderAddr, approveAmount, setApproveAmount, currentAllowance,
}) => {
  const [copied, setCopied]           = useState(false);
  const [showQR, setShowQR]           = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [addTokenOpen, setAddTokenOpen] = useState(false);
  const [customAddr, setCustomAddr]   = useState("");

  const animatedPortfolio = useCountUp(portfolioValue);
  const wrongNetwork = account !== null && chainId !== null && chainId !== SEPOLIA_ID;

  const copyAddress = () => {
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const onEnter = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === "Enter") fn(); };

  const inputClass = (error: string, focusColor = "focus:border-neon-blue") =>
    `w-full p-2 rounded bg-gray-900/80 border text-sm outline-none transition-colors ${
      error ? "border-red-500 focus:border-red-400" : `border-gray-700 ${focusColor}`
    }`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      className="relative min-h-screen bg-dark-bg text-white p-6 md:p-10 font-orbitron overflow-hidden"
    >
      {/* Dot-grid background */}
      <div className="fixed inset-0 pointer-events-none z-0 animate-grid-drift"
        style={{ backgroundImage: "radial-gradient(circle, rgba(0,255,255,0.055) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

      {/* QR code modal */}
      <AnimatePresence>
        {showQR && account && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              className="bg-dark-card border border-neon-blue/40 rounded-2xl p-6 flex flex-col items-center gap-4 shadow-[0_0_40px_#00ffff33]"
              onClick={e => e.stopPropagation()}
            >
              <p className="text-neon-blue text-sm font-semibold">Scan to receive tokens</p>
              <div className="p-3 bg-white rounded-xl">
                <QRCodeSVG value={account} size={180} />
              </div>
              <p className="text-gray-400 text-xs font-mono">{truncate(account)}</p>
              <button onClick={() => setShowQR(false)} className="text-xs text-gray-500 hover:text-neon-pink transition-colors">
                ✕ Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">

          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="text-center">
            <div className="text-5xl mb-2">⚡</div>
            <div className="flex justify-center mb-3">
              {!wrongNetwork && (
                <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-green-700/70 bg-green-950/40 text-green-400 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Sepolia Testnet
                </span>
              )}
            </div>
            <h1 style={{ backgroundSize: "200% 200%" }}
              className="text-4xl font-bold bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent animate-gradient-x">
              MaveriX Treasury
            </h1>
            <p className="text-gray-500 text-sm mt-1">Chainlink · Sepolia · Token Control</p>
          </div>

          {/* ── Wrong network ────────────────────────────────────────── */}
          <AnimatePresence>
            {wrongNetwork && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="bg-red-950/80 backdrop-blur-sm border border-red-700 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-red-300"><span>⚠️</span><span>Wrong network — switch to Sepolia.</span></div>
                <button onClick={switchToSepolia} className="shrink-0 text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded font-semibold transition-colors">
                  Switch to Sepolia
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Token selector ───────────────────────────────────────── */}
          <div className="flex justify-center gap-3 flex-wrap">
            {Object.entries(tokens).map(([key, info]) => (
              <button key={key} onClick={() => setTokenKey(key)}
                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg border transition-all ${
                  tokenKey === key
                    ? "border-neon-blue bg-dark-card/80 backdrop-blur-sm animate-pulse-ring"
                    : "border-dark-border bg-gray-900/60 backdrop-blur-sm hover:border-neon-blue/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {info.logo
                    ? <img src={info.logo} alt={info.symbol} className="w-5 h-5" />
                    : <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-neon-blue bg-dark-bg rounded-full border border-neon-blue">
                        {info.isCustom ? info.symbol[0] : "M"}
                      </span>
                  }
                  <span className="text-sm font-semibold">{info.symbol}</span>
                  {info.isCustom && <span className="text-[9px] text-neon-purple border border-neon-purple/40 px-1 rounded">custom</span>}
                </div>
                {account && (
                  balances[key] !== undefined
                    ? <span className="text-xs text-gray-400">{balances[key]} {info.symbol}</span>
                    : <Skeleton />
                )}
              </button>
            ))}
          </div>

          {/* ── Price + refresh ──────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-2 text-neon-blue">
            <p><strong>{token.symbol} Price:</strong> {tokenPriceUsd}</p>
            <button onClick={refreshPrices} disabled={pricesRefreshing} title="Refresh prices"
              className="text-gray-500 hover:text-neon-blue transition-colors disabled:opacity-40 text-base leading-none">
              <span className={pricesRefreshing ? "inline-block animate-spin-slow" : ""}>↻</span>
            </button>
          </div>

          {/* ── Portfolio ────────────────────────────────────────────── */}
          {account && portfolioValue > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-dark-card/60 backdrop-blur-md border border-neon-blue/30 rounded-xl p-6 shadow-[0_0_20px_#00ffff22]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="text-center">
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Portfolio</p>
                  <p className="text-3xl font-bold text-neon-blue drop-shadow-[0_0_8px_#00ffff]">
                    ${animatedPortfolio.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-36">
                  <Doughnut data={donutData} options={{
                    cutout: "65%",
                    plugins: {
                      legend: { position: "right", labels: { color: "#9ca3af", font: { size: 11 }, boxWidth: 12 } },
                      tooltip: { callbacks: { label: ctx => ` $${(ctx.raw as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}` } },
                    },
                  }} />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Price chart ──────────────────────────────────────────── */}
          {chartData.length > 0 && (
            <div className="bg-dark-card p-4 rounded-xl border border-dark-border shadow-[0_0_10px_#00ffff22]">
              <h3 className="text-xs font-semibold mb-3 text-gray-400 uppercase tracking-wider">
                {chartConfig?.label ?? "Price"} — Last 7 Days
              </h3>
              <Line
                data={{ labels: chartLabels, datasets: [{
                  label: chartConfig?.label ?? "Price", data: chartData,
                  borderColor: chartConfig?.color ?? "rgba(59,130,246,1)",
                  backgroundColor: (chartConfig?.color ?? "rgba(59,130,246,1)").replace("1)", "0.12)"),
                  tension: 0.3, fill: true, pointRadius: 0, pointHoverRadius: 4,
                }]}}
                options={{
                  interaction: { mode: "index" as const, intersect: false },
                  plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: "#1a1a1d", borderColor: "rgba(0,255,255,0.3)", borderWidth: 1, titleColor: "#9ca3af", bodyColor: "#00ffff", padding: 8 },
                  },
                  scales: {
                    x: { ticks: { color: "#6b7280", maxTicksLimit: 7 }, grid: { color: "#1e293b" } },
                    y: { ticks: { color: "#6b7280" }, grid: { color: "#1e293b" } },
                  },
                }}
                plugins={[crosshairPlugin]}
              />
            </div>
          )}

          {/* ── Wallet + actions ─────────────────────────────────────── */}
          {!account ? (
            <div className="text-center">
              <button onClick={connectWallet}
                className="bg-neon-blue hover:bg-cyan-400 px-8 py-3 rounded-lg font-semibold text-black shadow-[0_0_15px_#00ffff66] hover:shadow-[0_0_25px_#00ffff99] transition-all">
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Wallet info */}
              <div className="bg-dark-card/60 backdrop-blur-md p-4 rounded-xl border border-dark-border grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Address</p>
                  <div className="flex items-center gap-2">
                    {/* Click address → QR modal */}
                    <button onClick={() => setShowQR(true)} title="Show QR code"
                      className="font-mono text-neon-blue text-sm hover:text-cyan-300 transition-colors">
                      {truncate(account)}
                    </button>
                    <button onClick={copyAddress} title="Copy address" className="text-gray-500 hover:text-neon-blue transition-colors leading-none">
                      {copied ? <span className="text-green-400 text-xs font-sans">✓ Copied!</span> : <span className="text-sm">📋</span>}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">ETH Balance</p>
                  <p className="text-white font-semibold text-sm">
                    {ethBalance !== null ? `${ethBalance} ETH` : <Skeleton w="w-20" />}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">{token.symbol} Balance</p>
                  <p className="text-white font-semibold text-sm">
                    {tokenBalance !== undefined ? `${tokenBalance} ${token.symbol}` : <Skeleton w="w-20" />}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-3 pt-1 border-t border-dark-border/60">
                  <button onClick={disconnectWallet} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                    ⏻ Disconnect wallet
                  </button>
                </div>
              </div>

              {/* Action panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Send */}
                <div className="bg-dark-card/60 backdrop-blur-md p-4 rounded-xl border border-dark-border hover:shadow-[0_0_18px_#00ffff44] transition-all">
                  <h3 className="text-lg font-semibold mb-3 text-neon-blue">Send Tokens</h3>

                  {/* Recipient + ENS */}
                  <input type="text" placeholder="Address or ENS name (e.g. vitalik.eth)" value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                    onKeyDown={onEnter(transferTokens)}
                    className={inputClass(formErrors.recipient) + " mb-1"} />
                  {ensResolving && <p className="text-xs text-gray-500 mt-1">Resolving ENS...</p>}
                  {ensResolved && !ensResolving && (
                    <p className="text-xs text-green-400 mt-1">✓ Resolved: {truncate(ensResolved)}</p>
                  )}
                  {ensResolved === null && recipient.includes(".") && !ensResolving && (
                    <p className="text-xs text-red-400 mt-1">ENS name not found</p>
                  )}
                  <FieldError msg={formErrors.recipient} />

                  {/* Amount + MAX */}
                  <div className="flex items-center justify-between mt-2 mb-1">
                    <span className="text-xs text-gray-500">Amount</span>
                    <button onClick={() => setAmount(balances[tokenKey] ?? "0")}
                      className="text-xs text-neon-blue hover:text-cyan-300 font-semibold transition-colors">MAX</button>
                  </div>
                  <input type="text" placeholder="0.00" value={amount}
                    onChange={e => setAmount(e.target.value)}
                    onKeyDown={onEnter(transferTokens)}
                    className={inputClass(formErrors.amount) + " mb-1"} />
                  <FieldError msg={formErrors.amount} />

                  {/* Memo */}
                  <input type="text" placeholder="Memo (optional note, stored locally)" value={memo}
                    onChange={e => setMemo(e.target.value)}
                    onKeyDown={onEnter(transferTokens)}
                    className="w-full p-2 mt-2 mb-3 rounded bg-gray-900/80 border border-gray-700/50 text-sm focus:border-gray-500 outline-none text-gray-400 placeholder-gray-600" />

                  <button onClick={transferTokens} disabled={loading}
                    className="w-full bg-neon-blue hover:bg-cyan-400 text-black font-bold px-4 py-2 rounded shadow-[0_0_12px_#00ffff55] hover:shadow-[0_0_22px_#00ffff99] disabled:opacity-50 transition-all">
                    {loading ? "Sending..." : "Send →"}
                  </button>
                  <GasHint est={gasEstimates.transfer} />
                </div>

                <div className="space-y-6">
                  {/* Mint */}
                  <div className="bg-dark-card/60 backdrop-blur-md p-4 rounded-xl border border-dark-border hover:shadow-[0_0_18px_#c084fc44] transition-all">
                    <h3 className="text-lg font-semibold mb-3 text-neon-purple">Mint Tokens</h3>
                    <input type="text" placeholder="Amount to Mint" value={mintAmount}
                      onChange={e => setMintAmount(e.target.value)}
                      onKeyDown={onEnter(mintTokens)}
                      className={inputClass(formErrors.mintAmount, "focus:border-neon-purple") + " mb-1"} />
                    <FieldError msg={formErrors.mintAmount} />
                    <button onClick={mintTokens} disabled={loading}
                      className="w-full mt-3 bg-neon-purple hover:bg-purple-400 text-black font-bold px-4 py-2 rounded shadow-[0_0_12px_#c084fc55] hover:shadow-[0_0_22px_#c084fc99] disabled:opacity-50 transition-all">
                      {loading ? "Minting..." : "✦ Mint"}
                    </button>
                    <GasHint est={gasEstimates.mint} />
                  </div>

                  {/* Burn */}
                  <div className="bg-dark-card/60 backdrop-blur-md p-4 rounded-xl border border-dark-border hover:shadow-[0_0_18px_#ff00ff44] transition-all">
                    <h3 className="text-lg font-semibold mb-3 text-neon-pink">Burn Tokens</h3>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Amount</span>
                      <button onClick={() => setBurnAmount(balances[tokenKey] ?? "0")}
                        className="text-xs text-neon-pink hover:text-pink-300 font-semibold transition-colors">MAX</button>
                    </div>
                    <input type="text" placeholder="0.00" value={burnAmount}
                      onChange={e => setBurnAmount(e.target.value)}
                      onKeyDown={onEnter(burnTokens)}
                      className={inputClass(formErrors.burnAmount, "focus:border-neon-pink") + " mb-1"} />
                    <FieldError msg={formErrors.burnAmount} />
                    <button onClick={burnTokens} disabled={loading}
                      className="w-full mt-3 bg-neon-pink hover:bg-pink-400 text-black font-bold px-4 py-2 rounded shadow-[0_0_12px_#ff00ff55] hover:shadow-[0_0_22px_#ff00ff99] disabled:opacity-50 transition-all">
                      {loading ? "Burning..." : "🔥 Burn"}
                    </button>
                    <GasHint est={gasEstimates.burn} />
                  </div>
                </div>
              </div>

              {/* ── Token Approvals (collapsible) ───────────────────── */}
              <div className="bg-dark-card/60 backdrop-blur-md rounded-xl border border-dark-border overflow-hidden">
                <button onClick={() => setApproveOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-400 hover:text-neon-blue transition-colors">
                  <span className="flex items-center gap-2">✓ Token Approvals <span className="text-gray-600 font-normal text-xs">(set allowance for DeFi protocols)</span></span>
                  <span className={`text-xs transition-transform ${approveOpen ? "rotate-180" : ""}`}>▼</span>
                </button>
                <AnimatePresence>
                  {approveOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="px-4 pb-4 space-y-3 border-t border-dark-border/60">
                      <p className="text-xs text-gray-500 pt-3">Allow a DeFi protocol (e.g. Uniswap router) to spend your {token.symbol}.</p>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Spender Address</label>
                        <input type="text" placeholder="0x... (Uniswap, DEX router, etc.)" value={spenderAddr}
                          onChange={e => setSpenderAddr(e.target.value)}
                          onKeyDown={onEnter(approveTokens)}
                          className="w-full p-2 rounded bg-gray-900/80 border border-gray-700 text-sm focus:border-yellow-500 outline-none" />
                        {currentAllowance !== null && (
                          <p className="text-xs text-yellow-400 mt-1">Current allowance: {currentAllowance} {token.symbol}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Approval Amount</label>
                        <input type="text" placeholder="Amount to approve" value={approveAmount}
                          onChange={e => setApproveAmount(e.target.value)}
                          onKeyDown={onEnter(approveTokens)}
                          className="w-full p-2 rounded bg-gray-900/80 border border-gray-700 text-sm focus:border-yellow-500 outline-none" />
                      </div>
                      <button onClick={approveTokens} disabled={loading}
                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded shadow-[0_0_10px_#ca8a0455] hover:shadow-[0_0_18px_#ca8a0499] disabled:opacity-50 transition-all text-sm">
                        {loading ? "Approving..." : "✓ Set Allowance"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Add Custom Token (collapsible) ───────────────────── */}
              <div className="bg-dark-card/60 backdrop-blur-md rounded-xl border border-dark-border overflow-hidden">
                <button onClick={() => setAddTokenOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-400 hover:text-neon-purple transition-colors">
                  <span className="flex items-center gap-2">+ Add Custom Token <span className="text-gray-600 font-normal text-xs">(paste any ERC-20 contract address)</span></span>
                  <span className={`text-xs transition-transform ${addTokenOpen ? "rotate-180" : ""}`}>▼</span>
                </button>
                <AnimatePresence>
                  {addTokenOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="px-4 pb-4 space-y-3 border-t border-dark-border/60">
                      <p className="text-xs text-gray-500 pt-3">
                        Paste an ERC-20 contract address — name, symbol and decimals are read from the chain automatically.
                      </p>
                      <input type="text" placeholder="0x... contract address" value={customAddr}
                        onChange={e => setCustomAddr(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { addCustomToken(customAddr); setCustomAddr(""); } }}
                        className="w-full p-2 rounded bg-gray-900/80 border border-gray-700 text-sm focus:border-neon-purple outline-none" />
                      <button
                        onClick={() => { addCustomToken(customAddr); setCustomAddr(""); }}
                        disabled={loading}
                        className="w-full bg-neon-purple hover:bg-purple-400 text-black font-bold px-4 py-2 rounded shadow-[0_0_10px_#c084fc55] hover:shadow-[0_0_18px_#c084fc99] disabled:opacity-50 transition-all text-sm">
                        + Add Token
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          )}
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────── */}
        <div className="bg-dark-card/60 backdrop-blur-md border border-dark-border p-4 rounded-xl shadow-[0_0_15px_#ff00ff33] flex flex-col max-h-screen overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-lg font-semibold text-neon-pink flex items-center gap-2">
              Tx History
              {txHistory.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-neon-blue/15 text-neon-blue border border-neon-blue/35 font-normal">
                  {txHistory.length}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-3">
              {txHistory.length > 0 && (
                <>
                  <button onClick={exportCSV} title="Export CSV"
                    className="text-xs text-gray-500 hover:text-neon-blue transition-colors">⬇ CSV</button>
                  <button onClick={clearHistory} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Clear</button>
                </>
              )}
            </div>
          </div>

          {/* Pending */}
          <AnimatePresence>
            {pendingTxs.map(ptx => (
              <motion.div key={ptx.hash}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="bg-yellow-950/70 backdrop-blur-sm border border-yellow-700 rounded p-3 mb-2 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <span className="text-yellow-300 font-semibold">Pending</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${
                    ptx.type === "Transfer" ? "bg-green-700 text-green-200" :
                    ptx.type === "Mint"     ? "bg-purple-700 text-purple-200" :
                    ptx.type === "Approve"  ? "bg-yellow-700 text-yellow-200" :
                                              "bg-red-700 text-red-200"
                  }`}>{TX_ICON[ptx.type]} {ptx.type}</span>
                </div>
                <p className="text-yellow-200">{ptx.amount} {ptx.symbol}</p>
                <a href={`https://sepolia.etherscan.io/tx/${ptx.hash}`} target="_blank" rel="noreferrer"
                  className="text-neon-blue hover:underline">{truncate(ptx.hash)}</a>
              </motion.div>
            ))}
          </AnimatePresence>

          {txHistory.length === 0 && pendingTxs.length === 0 ? (
            <p className="text-gray-400 text-sm">No transactions yet.</p>
          ) : (
            <ul className="space-y-3 overflow-y-auto flex-1">
              <AnimatePresence initial={false}>
                {txHistory.map(tx => (
                  <motion.li key={tx.txHash}
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                    className="bg-gray-900/60 backdrop-blur-sm p-3 rounded border border-gray-700 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-yellow-400">{tx.timestamp}</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${
                        tx.type === "Transfer" ? "bg-green-700 text-green-200" :
                        tx.type === "Mint"     ? "bg-purple-700 text-purple-200" :
                        tx.type === "Approve"  ? "bg-yellow-700 text-yellow-200" :
                                                 "bg-red-700 text-red-200"
                      }`}>{TX_ICON[tx.type]} {tx.type}</span>
                    </div>
                    <p className="text-gray-300">{tx.amount} → <span className="font-mono text-gray-400">{truncate(tx.to)}</span></p>
                    {tx.memo && <p className="text-gray-500 italic mt-0.5">"{tx.memo}"</p>}
                    <p className="text-gray-500 mt-0.5">
                      TX: <a href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noreferrer"
                        className="text-neon-blue hover:underline">{truncate(tx.txHash)}</a>
                    </p>
                    <p className="text-gray-600 mt-0.5">Gas: {tx.gasUsed}</p>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default NeonDashboard;
