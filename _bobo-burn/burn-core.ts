export const OWNER = "BoboBurn11111111111111111111111111111111111";
export const ACCOUNT = "JEK83WrojZnFD2XGfCd5cSi112iT5siwhdb8X7Y5DAvR";
export const MINT = "4nV5gNwwP68zUDat26ySChREqVaQaLudfJBkSgEzpump";
export const DECIMALS = 6;
export type BurnEvent = { signature: string; at: number; slot: number; deltaRaw: string };
export type Snapshot = {
  asOf: string; slot: number; balanceRaw: string; headSignature: string;
  events: BurnEvent[]; historyComplete: boolean;
};
export type ApiData = Snapshot & { status: "live" | "cached" | "unavailable"; message?: string };
type TokenBalance = { accountIndex: number; mint: string; uiTokenAmount: { amount: string; decimals: number } };
export type ChainTransaction = {
  slot: number; blockTime: number | null;
  transaction: { signatures: string[]; message: { accountKeys: (string | { pubkey: string })[] } };
  meta: { err: unknown; preTokenBalances?: TokenBalance[]; postTokenBalances?: TokenBalance[] } | null;
};
export function parseTransaction(tx: ChainTransaction): BurnEvent {
  if (!tx.meta || tx.blockTime === null) throw new Error("Transaction metadata is unavailable");
  const index = tx.transaction.message.accountKeys.findIndex(k => (typeof k === "string" ? k : k.pubkey) === ACCOUNT);
  if (index < 0) throw new Error("Tracked account absent from transaction");
  const before = tx.meta.preTokenBalances?.find(b => b.accountIndex === index && b.mint === MINT);
  const after = tx.meta.postTokenBalances?.find(b => b.accountIndex === index && b.mint === MINT);
  if (!tx.meta.err && !before && !after) throw new Error("Token balances are unavailable");
  if ([before, after].some(b => b && b.uiTokenAmount.decimals !== DECIMALS)) throw new Error("Token decimals mismatch");
  return {
    signature: tx.transaction.signatures[0], at: tx.blockTime, slot: tx.slot,
    deltaRaw: tx.meta.err ? "0" : (BigInt(after?.uiTokenAmount.amount ?? "0") - BigInt(before?.uiTokenAmount.amount ?? "0")).toString(),
  };
}
export function mergeEvents(oldEvents: BurnEvent[], incoming: BurnEvent[]) {
  return [...new Map([...oldEvents, ...incoming].map(e => [e.signature, e])).values()].sort((a,b) => b.at-a.at || b.slot-a.slot);
}
export function daysFor(events: BurnEvent[], count: number, asOf: string) {
  const last = new Date(asOf); last.setUTCHours(0,0,0,0);
  return Array.from({length: count}, (_,i) => {
    const start = last.getTime() / 1000 - (count - i - 1) * 86400;
    const matching = events.filter(e => e.at >= start && e.at < start + 86400);
    const incoming = matching.reduce((sum,e) => sum + (BigInt(e.deltaRaw) > 0n ? BigInt(e.deltaRaw) : 0n), 0n);
    const outgoing = matching.reduce((sum,e) => sum + (BigInt(e.deltaRaw) < 0n ? -BigInt(e.deltaRaw) : 0n), 0n);
    return { date: new Date(start * 1000).toISOString().slice(0,10), incomingRaw: incoming.toString(), outgoingRaw: outgoing.toString(), count: matching.filter(e => BigInt(e.deltaRaw)>0n).length };
  });
}
export function exactAmount(raw: string) {
  const n = BigInt(raw); const sign = n < 0n ? "-" : ""; const a = n < 0n ? -n : n;
  return `${sign}${a/1000000n}.${(a%1000000n).toString().padStart(6,"0")}`;
}
