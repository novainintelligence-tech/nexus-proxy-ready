const DATACENTER_PATTERNS = [
  /amazon|aws|ec2/i,
  /google|gcp/i,
  /microsoft|azure/i,
  /digitalocean/i,
  /linode|akamai/i,
  /ovh|hetzner|contabo|vultr|leaseweb/i,
  /cloudflare/i,
  /hostinger|hostwinds|namecheap/i,
  /m247|psychz|colocrossing/i,
  /server|hosting|datacenter|data\s?center|cloud/i,
];

const MOBILE_PATTERNS = [
  /mobile|wireless|lte|3g|4g|5g/i,
  /vodafone|t-mobile|tmobile|t mobile|orange/i,
  /telstra|telefonica|airtel|jio/i,
];

const ISP_PATTERNS = [
  /comcast|verizon|att\b|spectrum|charter|cox|centurylink/i,
  /bt group|virgin\s?media|sky/i,
  /telekom|telecom|telmex/i,
  /isp|broadband|fiber|cable/i,
];

export function classifyProxy(isp: string | null | undefined, asn: string | null | undefined): string {
  const text = `${isp ?? ""} ${asn ?? ""}`.trim();
  if (!text) return "residential";

  for (const p of DATACENTER_PATTERNS) if (p.test(text)) return "datacenter";
  for (const p of MOBILE_PATTERNS) if (p.test(text)) return "mobile";
  for (const p of ISP_PATTERNS) if (p.test(text)) return "isp";

  return "residential";
}
