// app/api/cron/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const CRON_SECRET = process.env.CRON_SECRET;

function sbHeaders(json = true) {
  const h = { apikey: SB_SERVICE_ROLE, Authorization: `Bearer ${SB_SERVICE_ROLE}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function p2pFetch(side) {
  // usa los headers del feed
  const body = { asset:'USDT', fiat:'VES', tradeType: side, page:1, rows:50, publisherType:null, payTypes:[] };
  const r = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
    method:'POST',
    headers:{
      'content-type':'application/json',
      'accept':'application/json, text/plain, */*',
      'accept-language':'es-ES,es;q=0.9',
      'cache-control':'no-cache',
      'pragma':'no-cache',
      'origin':'https://p2p.binance.com',
      'referer':'https://p2p.binance.com/',
      'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
    },
    body: JSON.stringify(body),
    next:{ revalidate:0 }
  });
  if (!r.ok) throw new Error(`Binance ${side} ${r.status}`);
  const j = await r.json();
  const prices = (j?.data ?? [])
    .map(d => Number(String(d?.adv?.price).replace(/,/g,'')))
    .filter(Number.isFinite)
    .sort((a,b)=>a-b);
  if (!prices.length) throw new Error(`Sin precios ${side}`);
  const mid = prices.length % 2
    ? prices[(prices.length-1)/2]
    : (prices[prices.length/2-1] + prices[prices.length/2]) / 2;
  return { n: prices.length, median: mid };
}

export async function GET(req) {
  try {
    // auth del cron
    const auth = req.headers.get('authorization') || '';
    if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ ok:false, error:'Unauthorized' }, { status: 401 });
    }

    const [sell, buy] = await Promise.all([ p2pFetch('BUY'), p2pFetch('SELL') ]);
    const eff_sell = sell.median; // comprar USDT
    const eff_buy  = buy.median;  // vender USDT
    const spread   = eff_sell - eff_buy;
    const n        = Math.min(sell.n, buy.n);

    const ins = await fetch(`${SB_URL}/rest/v1/p2p_monitor_samples?select=*`, {
      method:'POST',
      headers:{ ...sbHeaders(true), Prefer:'return=representation' },
      body: JSON.stringify({ scope:'public', eff_buy, eff_sell, spread, n })
    });
    if (!ins.ok) {
      return NextResponse.json({ ok:false, error: await ins.text() }, { status: 502 });
    }
    const [saved] = await ins.json();
    return NextResponse.json({ ok:true, saved, ts: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 500 });
  }
}
