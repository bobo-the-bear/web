import { env } from "cloudflare:workers";
import seed from "./burn-seed.json";
import { ACCOUNT, OWNER, MINT, DECIMALS, mergeEvents, parseTransaction, type Snapshot, type ChainTransaction, type ApiData } from "./burn-core";

type Signature = { signature: string; blockTime: number | null; slot: number; err: unknown };
const ENDPOINTS = ["https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"];
async function save(key: string, snapshot: Snapshot) {
  if (!env.DB) return;
  await env.DB.prepare("INSERT INTO burn_cache (id,payload,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at WHERE excluded.updated_at > burn_cache.updated_at").bind(key,JSON.stringify(snapshot),Date.parse(snapshot.asOf)).run();
}
async function rpc<T>(endpoint: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({jsonrpc:"2.0", id:1, method, params}), signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Solana returned HTTP ${response.status}`);
  const body = await response.json() as {result?: T; error?: {message: string}};
  if (body.error || body.result == null) throw new Error("Solana data is temporarily unavailable");
  return body.result;
}
async function update(previous: Snapshot, endpoint: string): Promise<Snapshot> {
  const pending: Signature[] = [];
  let before: string | undefined;
  let found = !previous.headSignature;
  let head = previous.headSignature;
  for (let page=0; page<10; page++) {
    const signatures = await rpc<Signature[]>(endpoint,"getSignaturesForAddress",[ACCOUNT,{limit:1000,commitment:"finalized",...(before ? {before} : {})}]);
    if (page === 0 && signatures.length) head = signatures[0].signature;
    for (const signature of signatures) {
      if (signature.signature === previous.headSignature) { found=true; break; }
      pending.push(signature);
    }
    if (found || signatures.length < 1000) break;
    before=signatures[signatures.length-1].signature;
  }
  // Preserve the last fully reconciled history if the provider is truncated or a backlog exceeds this request's budget.
  if (!found) throw new Error("Provider did not return the last known transaction");
  // Catch up oldest-first in bounded chunks. Intermediate progress is stored separately from verified figures.
  const chunk = pending.length > 24 ? pending.slice(-24) : pending;
  const incoming = [];
  for (let i=0; i<chunk.length; i+=3) {
    const batch = await Promise.all(chunk.slice(i,i+3).map(async s => {
      const tx = await rpc<ChainTransaction>(endpoint,"getTransaction",[s.signature,{encoding:"jsonParsed",commitment:"finalized",maxSupportedTransactionVersion:0}]);
      return parseTransaction(tx);
    }));
    incoming.push(...batch);
  }
  const events = mergeEvents(previous.events,incoming);
  const total = events.reduce((sum,e)=>sum+BigInt(e.deltaRaw),0n);
  if (pending.length > chunk.length) {
    await save("bobo_sync",{...previous,asOf:new Date().toISOString(),events,headSignature:chunk[0].signature,balanceRaw:total.toString(),historyComplete:false});
    throw new Error("History catch-up is in progress");
  }
  const account = await rpc<{context:{slot:number};value:{data:{parsed:{info:{owner:string;mint:string;tokenAmount:{amount:string;decimals:number}}}}} | null}>(endpoint,"getAccountInfo",[ACCOUNT,{encoding:"jsonParsed",commitment:"finalized"}]);
  const info=account.value?.data.parsed.info;
  if (!info || info.owner !== OWNER || info.mint !== MINT || info.tokenAmount.decimals !== DECIMALS) throw new Error("Account identity verification failed");
  // A transfer may finalize between the history and balance requests. Never display a mixed snapshot as verified.
  if (total !== BigInt(info.tokenAmount.amount)) throw new Error("Balance changed during verification; retrying shortly");
  return {asOf:new Date().toISOString(),slot:account.context.slot,balanceRaw:info.tokenAmount.amount,headSignature:head,events,historyComplete:true};
}
export async function getBurnData(): Promise<ApiData> {
  let previous: Snapshot = seed;
  let progress: Snapshot | null = null;
  try {
    const cached = await env.DB?.prepare("SELECT payload FROM burn_cache WHERE id = ?").bind("bobo").first<{payload:string}>();
    if (cached) previous=JSON.parse(cached.payload);
    const pending=await env.DB?.prepare("SELECT payload FROM burn_cache WHERE id = ?").bind("bobo_sync").first<{payload:string}>();
    if(pending) progress=JSON.parse(pending.payload);
  } catch { console.warn(JSON.stringify({event:"burn_cache_read_unavailable"})); }
  const age=Date.now()-Date.parse(previous.asOf);
  if (age >= 0 && age < 60000) return {...previous,status:"live"};
  for (const endpoint of ENDPOINTS) {
    try {
      const base = progress && Date.parse(progress.asOf)>Date.parse(previous.asOf) ? progress : previous;
      const current=await update(base,endpoint);
      await save("bobo",current);
      return {...current,status:"live"};
    } catch (error) { console.warn(JSON.stringify({event:"burn_refresh_unavailable",provider:new URL(endpoint).hostname,reason:error instanceof Error ? error.message : "Unknown error"})); }
  }
  return {...previous,status:"cached",message:"Live verification is temporarily unavailable. Showing the last fully verified snapshot; try refreshing shortly."};
}
