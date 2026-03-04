import { useEffect, useState, useMemo } from "react";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import './index.css';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import NeonDashboard from "./NeonDashboard";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler
);

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface Transaction {
  type: string;
  amount: string;
  to: string;
  txHash: string;
  gasUsed: string;
  timestamp: string;
  memo?: string;
}

export interface PendingTx {
  hash: string; type: string; amount: string; symbol: string;
}

export interface TokenInfo {
  name: string; symbol: string; address: string;
  decimals: number; coingeckoId: string; logo: string;
  isCustom?: boolean;
}

export interface FormErrors {
  recipient: string; amount: string; mintAmount: string; burnAmount: string;
}

export interface GasEstimates {
  transfer: string | null; mint: string | null; burn: string | null;
}

export type ToastType = "success" | "error" | "info";

interface ToastMessage { id: string; message: string; type: ToastType; }

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_TOKENS: Record<string, TokenInfo> = {
  MXT: {
    name: "MaveriX Token", symbol: "MXT",
    address: "0x8ec06564305BF5624a784d943572Bc1A0ccB8166",
    decimals: 18, coingeckoId: "", logo: "",
  },
  WETH: {
    name: "Wrapped ETH", symbol: "WETH",
    address: "0xdd13E55209Fd76AfE204dBda4007C227904f0a81",
    decimals: 18, coingeckoId: "ethereum",
    logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  },
  WBTC: {
    name: "Wrapped BTC", symbol: "WBTC",
    address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    decimals: 8, coingeckoId: "bitcoin",
    logo: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
  },
};

const CHART_CONFIG: Record<string, { coingeckoId: string; label: string; color: string }> = {
  MXT:  { coingeckoId: "ethereum", label: "ETH/USD (reference)", color: "rgba(59,130,246,1)" },
  WETH: { coingeckoId: "ethereum", label: "ETH/USD",             color: "rgba(59,130,246,1)" },
  WBTC: { coingeckoId: "bitcoin",  label: "BTC/USD",             color: "rgba(247,147,26,1)" },
};

const tokenABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function burn(address from, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const EMPTY_ERRORS: FormErrors = { recipient: "", amount: "", mintAmount: "", burnAmount: "" };
const EMPTY_GAS:   GasEstimates = { transfer: null, mint: null, burn: null };

declare global { interface Window { ethereum?: any; } }

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  // Wallet
  const [account, setAccount]       = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [chainId, setChainId]       = useState<number | null>(null);

  // Tokens
  const [tokenKey, setTokenKey]     = useState<string>("MXT");
  const [balances, setBalances]     = useState<Record<string, string>>({});
  const [customTokens, setCustomTokens] = useState<Record<string, TokenInfo>>(() => {
    try { return JSON.parse(localStorage.getItem("customTokens") ?? "{}"); } catch { return {}; }
  });

  // Prices / chart
  const [tokenPriceUsd, setTokenPriceUsd] = useState<string>("Loading...");
  const [marketPrices, setMarketPrices]   = useState<Record<string, number>>({});
  const [chartData, setChartData]         = useState<number[]>([]);
  const [chartLabels, setChartLabels]     = useState<string[]>([]);
  const [pricesRefreshing, setPricesRefreshing] = useState(false);

  // TX state
  const [loading, setLoading]         = useState(false);
  const [toasts, setToasts]           = useState<ToastMessage[]>([]);
  const [pendingTxs, setPendingTxs]   = useState<PendingTx[]>([]);
  const [txHistory, setTxHistory]     = useState<Transaction[]>(() => {
    try { return JSON.parse(localStorage.getItem("txHistory") ?? "[]"); } catch { return []; }
  });

  // Form state
  const [recipient, setRecipientRaw]     = useState("");
  const [amount, setAmountRaw]           = useState("");
  const [mintAmount, setMintAmountRaw]   = useState("");
  const [burnAmount, setBurnAmountRaw]   = useState("");
  const [memo, setMemo]                  = useState("");
  const [formErrors, setFormErrors]      = useState<FormErrors>(EMPTY_ERRORS);
  const [gasEstimates, setGasEstimates]  = useState<GasEstimates>(EMPTY_GAS);

  // ENS
  const [ensResolved, setEnsResolved]   = useState<string | null>(null);
  const [ensResolving, setEnsResolving] = useState(false);

  // Approval
  const [spenderAddr, setSpenderAddrRaw]       = useState("");
  const [approveAmount, setApproveAmountRaw]   = useState("");
  const [currentAllowance, setCurrentAllowance] = useState<string | null>(null);

  // Merged token map
  const allTokens: Record<string, TokenInfo> = useMemo(
    () => ({ ...DEFAULT_TOKENS, ...customTokens }),
    [customTokens]
  );
  const token = allTokens[tokenKey] ?? DEFAULT_TOKENS.MXT;

  // ── Wrapped setters ───────────────────────────────────────────────────────
  const setRecipient   = (v: string) => { setRecipientRaw(v);  setFormErrors(p => ({ ...p, recipient: "" })); setEnsResolved(null); };
  const setAmount      = (v: string) => { setAmountRaw(v);     setFormErrors(p => ({ ...p, amount: "" })); };
  const setMintAmount  = (v: string) => { setMintAmountRaw(v); setFormErrors(p => ({ ...p, mintAmount: "" })); };
  const setBurnAmount  = (v: string) => { setBurnAmountRaw(v); setFormErrors(p => ({ ...p, burnAmount: "" })); };
  const setSpenderAddr   = (v: string) => { setSpenderAddrRaw(v); setCurrentAllowance(null); };
  const setApproveAmount = (v: string) => setApproveAmountRaw(v);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function notify(message: string, type: ToastType = "info") {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  function clearHistory() {
    setTxHistory([]); localStorage.removeItem("txHistory");
    notify("Transaction history cleared", "info");
  }

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem("txHistory", JSON.stringify(txHistory)); }, [txHistory]);

  useEffect(() => {
    if (account) { loadAllBalances(account); loadEthBalance(account); fetchMarketPrices(); }
  }, [account]);

  useEffect(() => {
    if (account) fetchTokenPrice(token.coingeckoId);
    fetchChartData(CHART_CONFIG[tokenKey]?.coingeckoId ?? "ethereum");
    setGasEstimates(EMPTY_GAS);
  }, [tokenKey, account]);

  useEffect(() => {
    if (!window.ethereum) return;
    const handler = (id: string) => setChainId(parseInt(id, 16));
    window.ethereum.on("chainChanged", handler);
    return () => window.ethereum?.removeListener?.("chainChanged", handler);
  }, []);

  useEffect(() => {
    if (!account) return;
    const id = setInterval(() => { fetchTokenPrice(token.coingeckoId); fetchMarketPrices(); }, 60_000);
    return () => clearInterval(id);
  }, [tokenKey, account]);

  // ENS resolution (debounced 600 ms)
  useEffect(() => {
    if (!recipient.includes(".")) { setEnsResolved(null); setEnsResolving(false); return; }
    setEnsResolving(true);
    const tid = setTimeout(async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const resolved = await provider.resolveName(recipient);
        setEnsResolved(resolved);
      } catch { setEnsResolved(null); }
      finally { setEnsResolving(false); }
    }, 600);
    return () => { clearTimeout(tid); setEnsResolving(false); };
  }, [recipient]);

  // Gas estimate: transfer
  useEffect(() => {
    if (!account || !recipient || !amount) { setGasEstimates(p => ({ ...p, transfer: null })); return; }
    const addr = ensResolved || recipient;
    if (!ethers.isAddress(addr)) return;
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) return;
    const tid = setTimeout(async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer   = await provider.getSigner();
        const contract = new ethers.Contract(token.address, tokenABI, signer);
        const gas      = await contract.transfer.estimateGas(addr, ethers.parseUnits(amount, token.decimals));
        const feeData  = await provider.getFeeData();
        const costEth  = parseFloat(ethers.formatEther(gas * (feeData.gasPrice ?? 0n))).toFixed(6);
        setGasEstimates(p => ({ ...p, transfer: `~${costEth} ETH` }));
      } catch { setGasEstimates(p => ({ ...p, transfer: null })); }
    }, 700);
    return () => clearTimeout(tid);
  }, [recipient, amount, tokenKey, account, ensResolved]);

  // Gas estimate: mint
  useEffect(() => {
    if (!account || !mintAmount || tokenKey !== "MXT") { setGasEstimates(p => ({ ...p, mint: null })); return; }
    const n = parseFloat(mintAmount);
    if (isNaN(n) || n <= 0) return;
    const tid = setTimeout(async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer   = await provider.getSigner();
        const contract = new ethers.Contract(token.address, tokenABI, signer);
        const gas      = await contract.mint.estimateGas(account, ethers.parseUnits(mintAmount, token.decimals));
        const feeData  = await provider.getFeeData();
        const costEth  = parseFloat(ethers.formatEther(gas * (feeData.gasPrice ?? 0n))).toFixed(6);
        setGasEstimates(p => ({ ...p, mint: `~${costEth} ETH` }));
      } catch { setGasEstimates(p => ({ ...p, mint: null })); }
    }, 700);
    return () => clearTimeout(tid);
  }, [mintAmount, tokenKey, account]);

  // Gas estimate: burn
  useEffect(() => {
    if (!account || !burnAmount) { setGasEstimates(p => ({ ...p, burn: null })); return; }
    const n = parseFloat(burnAmount);
    if (isNaN(n) || n <= 0) return;
    const tid = setTimeout(async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer   = await provider.getSigner();
        const contract = new ethers.Contract(token.address, tokenABI, signer);
        const gas      = await contract.burn.estimateGas(account, ethers.parseUnits(burnAmount, token.decimals));
        const feeData  = await provider.getFeeData();
        const costEth  = parseFloat(ethers.formatEther(gas * (feeData.gasPrice ?? 0n))).toFixed(6);
        setGasEstimates(p => ({ ...p, burn: `~${costEth} ETH` }));
      } catch { setGasEstimates(p => ({ ...p, burn: null })); }
    }, 700);
    return () => clearTimeout(tid);
  }, [burnAmount, tokenKey, account]);

  // Allowance check
  useEffect(() => {
    if (!account || !ethers.isAddress(spenderAddr)) { setCurrentAllowance(null); return; }
    const tid = setTimeout(async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer   = await provider.getSigner();
        const contract = new ethers.Contract(token.address, tokenABI, signer);
        const raw      = await contract.allowance(account, spenderAddr);
        setCurrentAllowance(parseFloat(ethers.formatUnits(raw, token.decimals)).toFixed(4));
      } catch { setCurrentAllowance(null); }
    }, 500);
    return () => clearTimeout(tid);
  }, [spenderAddr, tokenKey, account]);

  // ── Network ───────────────────────────────────────────────────────────────
  const detectChain = async () => {
    if (!window.ethereum) return;
    try { setChainId(parseInt(await window.ethereum.request({ method: "eth_chainId" }), 16)); }
    catch { /* ignore */ }
  };

  const switchToSepolia = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
    } catch (err: any) {
      if (err.code === 4902) {
        await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{
          chainId: "0xaa36a7", chainName: "Sepolia",
          rpcUrls: ["https://rpc.sepolia.org"],
          nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        }]});
      }
    }
  };

  // ── Wallet ────────────────────────────────────────────────────────────────
  const connectWallet = async () => {
    if (!window.ethereum) { notify("MetaMask not detected.", "error"); return; }
    try {
      const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]); detectChain();
    } catch { notify("Connection rejected.", "error"); }
  };

  const disconnectWallet = () => {
    setAccount(null); setBalances({}); setEthBalance(null);
    setChainId(null); setGasEstimates(EMPTY_GAS); setFormErrors(EMPTY_ERRORS);
    setCurrentAllowance(null); setEnsResolved(null);
    notify("Wallet disconnected", "info");
  };

  // ── Price refresh ─────────────────────────────────────────────────────────
  const refreshPrices = async () => {
    setPricesRefreshing(true);
    try { await Promise.all([token.coingeckoId ? fetchTokenPrice(token.coingeckoId) : Promise.resolve(), fetchMarketPrices()]); }
    finally { setPricesRefreshing(false); }
  };

  // ── Balance loaders ───────────────────────────────────────────────────────
  const loadEthBalance = async (addr: string) => {
    try {
      const raw = await new ethers.BrowserProvider(window.ethereum).getBalance(addr);
      setEthBalance(parseFloat(ethers.formatEther(raw)).toFixed(4));
    } catch { setEthBalance(null); }
  };

  const loadAllBalances = async (addr: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const newBals: Record<string, string> = {};
      await Promise.allSettled(
        Object.entries(allTokens).map(async ([key, info]) => {
          const contract = new ethers.Contract(info.address, tokenABI, signer);
          const bal = await contract.balanceOf(addr);
          newBals[key] = parseFloat(ethers.formatUnits(bal, info.decimals)).toFixed(4);
        })
      );
      setBalances(newBals);
    } catch (err) { console.error("Balance fetch failed:", err); }
  };

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchMarketPrices = async () => {
    try {
      const res  = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMarketPrices({ ethereum: data.ethereum?.usd ?? 0, bitcoin: data.bitcoin?.usd ?? 0 });
    } catch { /* silent */ }
  };

  const fetchChartData = async (coingeckoId: string) => {
    try {
      const res  = await fetch(`https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=7`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const prices: number[][] = data.prices;
      setChartLabels(prices.map(p => new Date(p[0]).toLocaleDateString()));
      setChartData(prices.map(p => parseFloat(p[1].toFixed(2))));
    } catch { /* silent */ }
  };

  const fetchTokenPrice = async (coingeckoId: string) => {
    if (!coingeckoId) { setTokenPriceUsd("N/A"); return; }
    try {
      const res  = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const price = data[coingeckoId]?.usd;
      setTokenPriceUsd(price ? `$${price.toLocaleString()}` : "N/A");
    } catch { setTokenPriceUsd("Unavailable"); }
  };

  // ── TX helpers ────────────────────────────────────────────────────────────
  const addToHistory = (type: string, amount: string, to: string, txHash: string, gasUsed: string, memo?: string) => {
    setTxHistory(prev => [{ type, amount, to, txHash, gasUsed, memo, timestamp: new Date().toLocaleTimeString() }, ...prev]);
  };

  const getTokenContract = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    return new ethers.Contract(token.address, tokenABI, await provider.getSigner());
  };

  const runTx = async (
    type: string, amt: string, to: string, txMemo: string,
    fn: () => Promise<{ hash: string; wait: () => Promise<{ gasUsed: bigint }> }>
  ) => {
    setLoading(true);
    let pendingEntry: PendingTx | null = null;
    try {
      const tx = await fn();
      pendingEntry = { hash: tx.hash, type, amount: amt, symbol: token.symbol };
      setPendingTxs(prev => [...prev, pendingEntry!]);
      notify(`${type} submitted — waiting for confirmation...`, "info");
      const receipt = await tx.wait();
      addToHistory(type, amt, to, tx.hash, receipt.gasUsed.toString(), txMemo || undefined);
      await loadAllBalances(account!);
      await loadEthBalance(account!);
      notify(`${type} confirmed ✓`, "success");
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#00FFFF", "#C084FC", "#FF00FF"] });
    } catch (err) {
      console.error(`${type} failed:`, err);
      notify(`${type} failed.`, "error");
    } finally {
      if (pendingEntry) setPendingTxs(prev => prev.filter(p => p.hash !== pendingEntry!.hash));
      setLoading(false);
    }
  };

  // ── Action handlers ───────────────────────────────────────────────────────
  const transferTokens = async () => {
    const errors = { ...EMPTY_ERRORS };
    const actualRecipient = ensResolved || recipient;
    if (!recipient)                        errors.recipient = "Recipient is required";
    else if (!ethers.isAddress(actualRecipient)) errors.recipient = "Invalid Ethereum address";
    if (!amount)                           errors.amount = "Amount is required";
    else if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) errors.amount = "Enter a valid amount > 0";
    else if (parseFloat(amount) > parseFloat(balances[tokenKey] ?? "0")) errors.amount = "Insufficient balance";
    if (errors.recipient || errors.amount) { setFormErrors(errors); return; }

    const txMemo = memo;
    await runTx("Transfer", amount, actualRecipient, txMemo, async () => {
      const contract = await getTokenContract();
      const tx = await contract.transfer(actualRecipient, ethers.parseUnits(amount, token.decimals));
      setRecipientRaw(""); setAmountRaw(""); setMemo("");
      setGasEstimates(p => ({ ...p, transfer: null }));
      return tx;
    });
  };

  const mintTokens = async () => {
    const errors = { ...EMPTY_ERRORS };
    if (tokenKey !== "MXT") { notify("Minting only allowed for MXT.", "error"); return; }
    if (!mintAmount) errors.mintAmount = "Amount is required";
    else if (isNaN(parseFloat(mintAmount)) || parseFloat(mintAmount) <= 0) errors.mintAmount = "Enter a valid amount > 0";
    if (errors.mintAmount) { setFormErrors(errors); return; }

    await runTx("Mint", mintAmount, account!, "", async () => {
      const contract = await getTokenContract();
      const tx = await contract.mint(account, ethers.parseUnits(mintAmount, token.decimals));
      setMintAmountRaw(""); setGasEstimates(p => ({ ...p, mint: null }));
      return tx;
    });
  };

  const burnTokens = async () => {
    const errors = { ...EMPTY_ERRORS };
    if (!burnAmount) errors.burnAmount = "Amount is required";
    else if (isNaN(parseFloat(burnAmount)) || parseFloat(burnAmount) <= 0) errors.burnAmount = "Enter a valid amount > 0";
    else if (parseFloat(burnAmount) > parseFloat(balances[tokenKey] ?? "0")) errors.burnAmount = "Insufficient balance";
    if (errors.burnAmount) { setFormErrors(errors); return; }

    await runTx("Burn", burnAmount, account!, "", async () => {
      const contract = await getTokenContract();
      const tx = await contract.burn(account, ethers.parseUnits(burnAmount, token.decimals));
      setBurnAmountRaw(""); setGasEstimates(p => ({ ...p, burn: null }));
      return tx;
    });
  };

  const approveTokens = async () => {
    if (!ethers.isAddress(spenderAddr)) { notify("Invalid spender address.", "error"); return; }
    if (!approveAmount || isNaN(parseFloat(approveAmount)) || parseFloat(approveAmount) < 0) {
      notify("Enter a valid approval amount.", "error"); return;
    }
    await runTx("Approve", approveAmount, spenderAddr, "", async () => {
      const contract = await getTokenContract();
      const tx = await contract.approve(spenderAddr, ethers.parseUnits(approveAmount, token.decimals));
      setSpenderAddrRaw(""); setApproveAmountRaw("");
      return tx;
    });
  };

  // ── Add custom token ──────────────────────────────────────────────────────
  const addCustomToken = async (contractAddress: string) => {
    if (!ethers.isAddress(contractAddress)) { notify("Invalid contract address.", "error"); return; }
    if (allTokens[contractAddress]) { notify("Token already tracked.", "info"); return; }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const erc20    = new ethers.Contract(contractAddress, tokenABI, signer);
      const [name, symbol, decimals] = await Promise.all([erc20.name(), erc20.symbol(), erc20.decimals()]);
      const key      = symbol.toUpperCase();
      const newToken: TokenInfo = {
        name, symbol: key, address: contractAddress,
        decimals: Number(decimals), coingeckoId: "", logo: "", isCustom: true,
      };
      const updated = { ...customTokens, [key]: newToken };
      setCustomTokens(updated);
      localStorage.setItem("customTokens", JSON.stringify(updated));
      notify(`${key} added successfully!`, "success");
      if (account) loadAllBalances(account);
    } catch { notify("Failed to read token contract.", "error"); }
  };

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const header = "Type,Amount,To,TxHash,Gas Used,Timestamp,Memo";
    const rows   = txHistory.map(tx =>
      [tx.type, tx.amount, tx.to, tx.txHash, tx.gasUsed, tx.timestamp, tx.memo ?? ""].join(",")
    );
    const csv  = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `maverix-treasury-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("CSV exported!", "success");
  };

  // ── Portfolio ─────────────────────────────────────────────────────────────
  const tokenUsdValues = Object.entries(allTokens).map(([key, info]) => {
    const bal   = parseFloat(balances[key] ?? "0");
    const price = info.coingeckoId === "ethereum" ? (marketPrices.ethereum ?? 0)
                : info.coingeckoId === "bitcoin"  ? (marketPrices.bitcoin  ?? 0) : 0;
    return { key, symbol: info.symbol, usdValue: bal * price };
  });
  const portfolioValue = tokenUsdValues.reduce((s, t) => s + t.usdValue, 0);
  const donutData = {
    labels: tokenUsdValues.map(t => t.symbol),
    datasets: [{
      data: tokenUsdValues.map(t => parseFloat(t.usdValue.toFixed(2))),
      backgroundColor: ["#00FFFF", "#3b82f6", "#f7931a", "#a855f7", "#ec4899"],
      borderColor: "#0e0e10", borderWidth: 3,
    }],
  };

  return (
    <>
      <NeonDashboard
        tokens={allTokens}
        account={account}
        balances={balances}
        ethBalance={ethBalance}
        tokenBalance={balances[tokenKey]}
        token={token}
        tokenKey={tokenKey}
        setTokenKey={setTokenKey}
        tokenPriceUsd={tokenPriceUsd}
        portfolioValue={portfolioValue}
        donutData={donutData}
        chartLabels={chartLabels}
        chartData={chartData}
        chartConfig={CHART_CONFIG[tokenKey]}
        txHistory={txHistory}
        pendingTxs={pendingTxs}
        loading={loading}
        chainId={chainId}
        switchToSepolia={switchToSepolia}
        pricesRefreshing={pricesRefreshing}
        refreshPrices={refreshPrices}
        formErrors={formErrors}
        gasEstimates={gasEstimates}
        ensResolved={ensResolved}
        ensResolving={ensResolving}
        memo={memo}
        setMemo={setMemo}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        clearHistory={clearHistory}
        exportCSV={exportCSV}
        transferTokens={transferTokens}
        mintTokens={mintTokens}
        burnTokens={burnTokens}
        approveTokens={approveTokens}
        addCustomToken={addCustomToken}
        recipient={recipient}
        setRecipient={setRecipient}
        amount={amount}
        setAmount={setAmount}
        mintAmount={mintAmount}
        setMintAmount={setMintAmount}
        burnAmount={burnAmount}
        setBurnAmount={setBurnAmount}
        spenderAddr={spenderAddr}
        setSpenderAddr={setSpenderAddr}
        approveAmount={approveAmount}
        setApproveAmount={setApproveAmount}
        currentAllowance={currentAllowance}
      />

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map(toast => (
            <motion.div key={toast.id}
              initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.2 }}
              className={`px-4 py-3 rounded shadow-lg text-sm max-w-sm pointer-events-auto font-orbitron ${
                toast.type === "success" ? "bg-green-900 border border-green-700 text-green-100"
              : toast.type === "error"   ? "bg-red-950 border border-red-800 text-red-100"
              :                            "bg-dark-card border border-dark-border text-gray-200"
              }`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

export default App;
