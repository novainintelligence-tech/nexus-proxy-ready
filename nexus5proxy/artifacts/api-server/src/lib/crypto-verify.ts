/**
 * Best-effort on-chain payment verification using public APIs.
 * Returns:
 *   { verified: true,  amount: number }      → tx exists, paid >= expected, to right address
 *   { verified: false, reason: string }      → tx not found / wrong address / underpaid
 *
 * If the verification call itself fails (network/timeout), we throw so the caller
 * can fall back to "manual review".
 */
import { logger } from "./logger";

type VerifyResult =
  | { verified: true; amountReceived: string }
  | { verified: false; reason: string };

async function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function approxEqual(a: number, b: number, tolPct = 0.5): boolean {
  // tolerate tolPct % difference (rounding / fees)
  if (b === 0) return a === 0;
  return Math.abs(a - b) / b <= tolPct / 100;
}

// ── BTC via blockstream.info ──────────────────────────────────────────────
async function verifyBtc(txHash: string, address: string, expectedBtc: string): Promise<VerifyResult> {
  const tx = await fetchJson(`https://blockstream.info/api/tx/${txHash}`);
  const out = (tx.vout ?? []).find((o: any) => o.scriptpubkey_address === address);
  if (!out) return { verified: false, reason: "Address not found in tx outputs" };
  const receivedBtc = out.value / 1e8;
  const expected = parseFloat(expectedBtc);
  if (!approxEqual(receivedBtc, expected)) {
    return { verified: false, reason: `Amount ${receivedBtc} BTC < expected ${expectedBtc} BTC` };
  }
  if (!tx.status?.confirmed) return { verified: false, reason: "Tx not yet confirmed" };
  return { verified: true, amountReceived: receivedBtc.toString() };
}

// ── USDT TRC20 via TronGrid public API ─────────────────────────────────────
async function verifyUsdtTrc20(
  txHash: string,
  address: string,
  expectedUsdt: string,
): Promise<VerifyResult> {
  const data = await fetchJson(`https://api.trongrid.io/v1/transactions/${txHash}/events`);
  const transfers = (data.data ?? []).filter(
    (e: any) => e.event_name === "Transfer" && e.contract_address === "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  );
  const match = transfers.find(
    (e: any) => (e.result?.to || "").toLowerCase() === address.toLowerCase(),
  );
  if (!match) return { verified: false, reason: "No matching USDT transfer to address" };
  const value = Number(match.result?.value ?? "0") / 1e6; // USDT-TRC20 has 6 decimals
  const expected = parseFloat(expectedUsdt);
  if (!approxEqual(value, expected)) {
    return { verified: false, reason: `Amount ${value} USDT < expected ${expected} USDT` };
  }
  return { verified: true, amountReceived: value.toString() };
}

// ── USDC ERC20 via Etherscan ───────────────────────────────────────────────
// Uses public no-key endpoint (rate limited but fine for sporadic admin verification).
async function verifyUsdcErc20(
  txHash: string,
  address: string,
  expectedUsdc: string,
): Promise<VerifyResult> {
  const data = await fetchJson(
    `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}`,
  );
  const result = data.result;
  if (!result) return { verified: false, reason: "Tx not found on Ethereum" };
  if (result.status !== "0x1") return { verified: false, reason: "Tx failed on chain" };
  const usdcContract = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
  const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const padAddr = address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const log = (result.logs ?? []).find(
    (l: any) =>
      l.address?.toLowerCase() === usdcContract &&
      l.topics?.[0] === transferTopic &&
      l.topics?.[2]?.toLowerCase().endsWith(padAddr),
  );
  if (!log) return { verified: false, reason: "No matching USDC transfer to address" };
  const value = parseInt(log.data, 16) / 1e6; // USDC has 6 decimals
  const expected = parseFloat(expectedUsdc);
  if (!approxEqual(value, expected)) {
    return { verified: false, reason: `Amount ${value} USDC < expected ${expected} USDC` };
  }
  return { verified: true, amountReceived: value.toString() };
}

export async function verifyPaymentOnChain(opts: {
  currency: string;
  txHash: string;
  walletAddress: string;
  expectedAmount: string;
}): Promise<VerifyResult> {
  const { currency, txHash, walletAddress, expectedAmount } = opts;
  try {
    if (currency === "BTC") return await verifyBtc(txHash, walletAddress, expectedAmount);
    if (currency === "USDT_TRC20") return await verifyUsdtTrc20(txHash, walletAddress, expectedAmount);
    if (currency === "USDC" || currency === "USDC_ERC20") return await verifyUsdcErc20(txHash, walletAddress, expectedAmount);
    return { verified: false, reason: `Unknown currency: ${currency}` };
  } catch (e: any) {
    logger.warn({ err: e?.message, currency, txHash }, "Crypto verification call failed");
    throw e;
  }
}
