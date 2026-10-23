"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, ArrowUpRight, RefreshCw, Download, Copy, Check, ArrowDown, ArrowRight, ExternalLink, Activity, ShieldCheck } from "lucide-react";
import seed from "./burn-seed.json";
import { ACCOUNT, OWNER, MINT, daysFor, exactAmount, type ApiData } from "./burn-core";

const number = (raw: string, digits=2) => Number(exactAmount(raw)).toLocaleString("en-US",{maximumFractionDigits:digits});
const compact = (raw: string) => Number(exactAmount(raw)).toLocaleString("en-US",{notation:"compact",maximumFractionDigits:1});
const dayLabel = (date:string) => new Date(date+"T12:00:00Z").toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"});
const timeLabel = (date:string) => new Date(date).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"UTC"})+" UTC";
const shorten = (text:string) => text.slice(0,7)+"…"+text.slice(-5);
const explorer = (address:string) => `https://solscan.io/account/${address}`;

function Address({label,address}:{label:string;address:string}) {
  const [copied,setCopied]=useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(address);setCopied(true);setTimeout(()=>setCopied(false),1800); }
    catch { setCopied(false); }
  }
  return <div className="address"><span>{label}</span><div><a href={explorer(address)} target="_blank" rel="noreferrer" title={address}><code>{shorten(address)}</code><ArrowUpRight size={13}/></a><button className="icon-button" onClick={copy} aria-label={`Copy ${label}`} title={copied?"Copied":"Copy address"}>{copied?<Check size={14}/>:<Copy size={14}/>}</button></div></div>;
}

export default function Dashboard() {
  const [data,setData]=useState<ApiData>({...seed,status:"cached"});
  const [loading,setLoading]=useState(true);
  const [range,setRange]=useState(7);
  const [selected,setSelected]=useState<string|null>(null);
  const [showAll,setShowAll]=useState(false);
  const [now,setNow]=useState(()=>Date.parse(seed.asOf));
  const busy=useRef(false);
  const refresh=useCallback(async()=>{
    if(busy.current)return; busy.current=true;setLoading(true);
    try {
      const response=await fetch("https://bobo-burn-data.bobo-meme-generator.workers.dev/api/burn",{cache:"no-store",signal:AbortSignal.timeout(55000)});
      if(!response.ok)throw new Error("Refresh unavailable");
      const next=await response.json() as ApiData;
      if(!next.balanceRaw || !Array.isArray(next.events))throw new Error("Invalid data");
      setData(next);
    } catch {setData(d=>({...d,status:"cached",message:"The live connection is unavailable. These figures are from the last verified snapshot."}));}
    finally {busy.current=false;setLoading(false);setNow(Date.now());}
  },[]);
  useEffect(()=>{void refresh();const id=setInterval(()=>{setNow(Date.now());if(!document.hidden)void refresh();},60000);return()=>clearInterval(id);},[refresh]);
  const stale=data.status!=="live" || now-Date.parse(data.asOf)>120000;
  const days=daysFor(data.events,range,data.asOf);
  const week=daysFor(data.events,7,data.asOf);
  const today=week[week.length-1];
  const currentCalendarDay=new Date(now).toISOString().slice(0,10)===today.date;
  const weekTotal=week.reduce((s,d)=>s+BigInt(d.incomingRaw),0n).toString();
  const periodTotal=days.reduce((s,d)=>s+BigInt(d.incomingRaw),0n).toString();
  const max=Math.max(...days.map(d=>Number(d.incomingRaw)),1);
  const detail=days.find(d=>d.date===selected)??days[days.length-1];
  const events=data.events.filter(e=>e.deltaRaw!=="0");
  const recent=showAll?events:events.slice(0,6);
  const hasOutflows=data.events.some(e=>BigInt(e.deltaRaw)<0n);
  function download() {
    const lines=["date_utc,bobo_received,bobo_sent,receiving_transactions,verified_at_utc",...days.map(d=>`${d.date},${exactAmount(d.incomingRaw)},${exactAmount(d.outgoingRaw)},${d.count},${data.asOf}`)];
    const url=URL.createObjectURL(new Blob([lines.join("\r\n")],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download=`bobo-burn-${range}d-${today.date}.csv`;a.click();URL.revokeObjectURL(url);
  }
  return <>
    <header className="site-header"><div className="shell header-inner"><a className="brand" href="#top" aria-label="BOBO Burn home"><span className="brand-mark"><Flame size={22}/></span><strong>BOBO<span>BURN</span></strong></a><nav><a href="/">Bobo home</a><a href="#history">Burn history</a><a href="#how-it-works">How it works</a><a className="explorer-link" href={explorer(OWNER)} target="_blank" rel="noreferrer">View on Solscan <ArrowUpRight size={15}/></a></nav></div></header>
    <main id="top" className="shell">
      <section className="intro"><div><p className="eyebrow"><span/> THE BOBO BURN TRACKER</p><h1>A LITTLE LESS BOBO.<br/><em>A LOT MORE ACTION.</em></h1><p className="intro-copy">Follow the BOBO flowing into BoboBurn.<br/>Powered by GRR rewards. Recorded on Solana.</p></div><figure className="meme-scene"><img src="/assets/bobo-burn/meme.png" alt="Bobo smiling in front of a burning building" width="1066" height="695"/><figcaption><Flame size={13}/> BOBO WATCHING THE BURN</figcaption></figure></section>
      <div className="status-line"><span className={`connection ${stale?"cached":""}`}><span/>{loading?"Verifying on Solana":stale?"Saved snapshot":"Live · Solana mainnet"}</span><div><span className="verified-time">Last verified {timeLabel(data.asOf)}</span><button className="refresh-button" aria-label="Refresh live data" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={14} className={loading?"spin":""}/><span>Refresh</span></button></div></div>
      {data.message&&<div className="notice" role="status">{data.message}</div>}
      <section className="metrics" aria-label="BOBO burn metrics">
        <article className="metric main-metric"><div className="metric-label">BOBO at the burn address <Flame size={18}/></div><div className="main-number" title={number(data.balanceRaw,6)}>{number(data.balanceRaw,2)}<span>BOBO</span></div><a href={explorer(ACCOUNT)} target="_blank" rel="noreferrer"><ShieldCheck size={14}/> On-chain token balance <ArrowUpRight size={13}/></a><div className="metric-glow"/></article>
        <article className="metric"><div className="metric-label">{currentCalendarDay?"Added today":"Added "+dayLabel(today.date)}<span className="pill">UTC</span></div><div className="stat-number">+{number(today.incomingRaw)}<span>BOBO</span></div><p><span className="tiny-dot"/>{today.count} receiving transaction{today.count===1?"":"s"} · partial day</p></article>
        <article className="metric"><div className="metric-label">Added in 7 days <Activity size={17}/></div><div className="stat-number">+{number(weekTotal)}<span>BOBO</span></div><p>{dayLabel(week[0].date)} – {dayLabel(today.date)} · UTC</p></article>
      </section>
      <section id="history" className="chart-panel panel"><div className="panel-heading"><div><p className="eyebrow muted">FOLLOW THE FLOW</p><h2>Daily BOBO arrivals</h2></div><div className="chart-actions"><div className="segmented" aria-label="Chart date range">{[7,30].map(n=><button key={n} aria-pressed={range===n} onClick={()=>{setRange(n);setSelected(null);}}>{n}D</button>)}</div><button className="export-button" aria-label="Export daily totals as CSV" onClick={download}><Download size={15}/><span>Export CSV</span></button></div></div><div className="chart-summary"><strong>{number(periodTotal)} <span>BOBO received</span></strong><span>Daily totals · UTC</span></div>
        <div className="chart" role="group" aria-label={`BOBO received per day over ${range} days`}><div className="chart-grid" aria-hidden="true"><div/><div/><div/><div/></div><div className="y-labels" aria-hidden="true"><span>{compact(String(Math.ceil(max)))}</span><span>{compact(String(Math.ceil(max/2)))}</span><span>0</span></div><div className="bars">{days.map((d,i)=><button className={`bar-column ${detail.date===d.date?"selected":""}`} key={d.date} onClick={()=>setSelected(d.date)} aria-label={`${dayLabel(d.date)}: ${number(d.incomingRaw,6)} BOBO received in ${d.count} transactions`} aria-pressed={detail.date===d.date} title={`${dayLabel(d.date)} · ${number(d.incomingRaw,6)} BOBO`}><span className="bar-space"><span className={`bar ${d.incomingRaw==="0"?"zero":""}`} style={{height:`${Math.max(Number(d.incomingRaw)/max*100,d.incomingRaw==="0"?1:1.5)}%`}}/></span><span className="x-label">{range===7||i%5===0||i===days.length-1?dayLabel(d.date):""}</span></button>)}</div></div>
        <div className="chart-detail" aria-live="polite"><span><span className="square-dot"/>{dayLabel(detail.date)}{detail.date===today.date?" · partial day":""}</span><strong>+{number(detail.incomingRaw,6)} BOBO</strong><span>{detail.count} receiving transaction{detail.count===1?"":"s"}</span></div>
      </section>
      <div className="lower-grid"><section className="panel transactions"><div className="panel-heading"><div><p className="eyebrow muted">ON-CHAIN RECEIPTS</p><h2>Recent activity</h2></div><a className="text-link" href={explorer(ACCOUNT)} target="_blank" rel="noreferrer">Solscan <ArrowUpRight size={14}/></a></div><div className="table-wrap"><table><thead><tr><th>Transaction</th><th>Time (UTC)</th><th>BOBO change</th></tr></thead><tbody>{recent.map(e=><tr key={e.signature}><td><a href={`https://solscan.io/tx/${e.signature}`} target="_blank" rel="noreferrer"><span className="tx-icon"><ArrowDown size={13}/></span><code>{shorten(e.signature)}</code><ArrowUpRight size={12}/></a></td><td>{new Date(e.at*1000).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"UTC"})}</td><td className={BigInt(e.deltaRaw)<0n?"outflow":"inflow"} title={number(e.deltaRaw,6)}>{BigInt(e.deltaRaw)>0n?"+":""}{number(e.deltaRaw,6)}</td></tr>)}</tbody></table></div>{events.length>6&&<button className="show-more" onClick={()=>setShowAll(!showAll)}>{showAll?"Show fewer transactions":`View all ${events.length} transactions`}<ArrowRight size={14}/></button>}</section>
      <aside className="panel source-panel"><span className="source-icon"><ShieldCheck size={22}/></span><h2>Every number.<br/>On the record.</h2><p>One designated address.<br/>One BOBO token account.<br/>A transparent trail you can verify.</p><Address label="Burn address" address={OWNER}/><Address label="BOBO token account" address={ACCOUNT}/><Address label="BOBO token mint" address={MINT}/><div className="source-foot"><span className="tiny-dot"/> Finalized Solana transactions</div></aside></div>
      <section id="how-it-works" className="how"><div className="how-title"><p className="eyebrow muted">THE GRR → BOBO LOOP</p><h2>Trades feed<br/>the burn.</h2><p>GRR distributes rewards in BOBO. BoboBurn receives its share.</p></div><div className="steps"><article><span>01</span><div><h3>GRR gets traded</h3><p>Trading activity generates BOBO rewards for GRR holders.</p></div></article><article><span>02</span><div><h3>BoboBurn holds GRR</h3><p>20% of the GRR supply was sent to the designated address, according to the project creator.</p></div></article><article><span>03</span><div><h3>BOBO arrives. We track it.</h3><p>The tracker records changes to BoboBurn’s BOBO account and groups arrivals by day.</p></div></article></div></section>
      <details className="methodology"><summary><span><ShieldCheck size={16}/> What does “burned” mean here?</span><span className="details-plus">+</span></summary><div><p>This tracker measures BOBO held by the project-designated BoboBurn address. Sending tokens to an address is different from a Solana token-burn instruction, which reduces the mint’s supply. Address balances alone do not prove that tokens are permanently unspendable.</p><p>Daily arrivals sum positive net changes to the tracked token account in finalized transactions. Outgoing changes are recorded separately{hasOutflows?"; outgoing activity has been detected":"; none appear in the verified history"}. Transactions can include transfers from sources other than GRR. The tracker does not attribute all arrivals to rewards.</p><p>Days run from 00:00 to 23:59:59 UTC. The current day is partial. Figures refresh every minute while this page is visible. When the page is reopened, history is reconstructed from on-chain records. A saved snapshot remains clearly dated if verification is unavailable.</p><p>All arithmetic uses the token’s six-decimal base units. The current balance is reconciled against the full retrieved history before the snapshot is marked verified. Verification slot: <code>{data.slot.toLocaleString("en-US")}</code>.</p><a href="https://solana.com/docs/tokens/basics/burn-tokens" target="_blank" rel="noreferrer">About Solana token burns <ExternalLink size={12}/></a></div></details>
    </main><footer className="shell"><a className="brand" href="#top"><Flame size={20}/><strong>BOBO<span>BURN</span></strong></a><span>The burn, in plain sight.</span><span>Built for the BOBO community <span className="footer-dot">●</span></span></footer>
  </>;
}
