export const CRYPTO_WALLETS: Record<string, { address: string; network: string; label: string }> = {
  BTC: {
    address: process.env.WALLET_BTC ?? "bc1qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    network: "Bitcoin",
    label: "Bitcoin (BTC)",
  },
  USDT_TRC20: {
    address: process.env.WALLET_USDT_TRC20 ?? "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXxx",
    network: "TRON (TRC20)",
    label: "USDT TRC20",
  },
  USDC: {
    address: process.env.WALLET_USDC ?? "0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    network: "Ethereum (ERC20)",
    label: "USDC (ERC20)",
  },
};

export const CRYPTO_RATES: Record<string, number> = {
  BTC: 0.000015,
  USDT_TRC20: 1.0,
  USDC: 1.0,
};

export function getCryptoAmount(usdCents: number, currency: string): string {
  const usdAmount = usdCents / 100;
  const rate = CRYPTO_RATES[currency] ?? 1;
  return (usdAmount * rate).toFixed(currency === "BTC" ? 8 : 2);
}
