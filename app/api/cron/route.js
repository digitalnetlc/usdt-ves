// app/api/cron/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const CRON_SECRET = process.env.CRON_SECRET;

function sbHeaders(json = true) {
  const h = { apikey: SB_SERVICE_ROLE, Authorization: `Bearer ${SB_SERVICE_ROLE}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function p2pFetch(side) {
  const body = { asset:'USDT', fiat:'VES', tradeType: side, page:1, rows:30, publisherType:null, payTypes:[] };
  const r = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
    method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body), next:{ revalidate:0 }
  });
  if (!r.ok) throw new Error(`Binance ${side} ${r.status}`);
  const j = await r.json();
  const prices = (j?.data ?? [])
    .map(d => Number(d?.adv?.price))
    .filter(Number.isFinite)
    .sort((a,b)=>a-b);
  if (!prices.length) throw new Error(`Sin precios ${side}`);
  const mid = prices.length % 2
    ? prices[(prices.length-1)/2]
    : (prices[prices.length/2-1] + prices[prices.length/2]) / 2;
  return { n: prices.length, median: mid };
}

// app/api/cron/route.js (solo la parte de tarea)
async function taskP2PSample({ bank = '', amountVES = 0 } = {}) {
  const u = new URL(`${process.env.SITE_URL || 'https://usdt-ves.vercel.app'}/api/feeds/binance`);
  if (bank) u.searchParams.set('bank', bank);
  if (amountVES) u.searchParams.set('amountVES', String(amountVES));
  const r = await fetch(u.toString(), { cache:'no-store' });
  const j = await r.json();
  if (!r.ok || !Number.isFinite(j?.eff_buy) || !Number.isFinite(j?.eff_sell)) {
    throw new Error(j?.error || 'Feed vacío');
  }
  const ins = await fetch(`${SB_URL}/rest/v1/p2p_monitor_samples?select=*`, {
    method:'POST',
    headers:{ ...sbHeaders(true), Prefer:'return=representation' },
    body: JSON.stringify({
      scope:'public',
      eff_buy: j.eff_buy,
      eff_sell: j.eff_sell,
      spread: j.spread,
      n: Math.min(j.n_buy||0, j.n_sell||0),
      bank: (j?.params?.bank || '').toLowerCase() || null,
      amount_ves: j?.params?.amountVES ?? null
    })
  });
  if (!ins.ok) throw new Error(await ins.text());
  const [saved] = await ins.json();
  return { saved };
}

export async function GET(req) {
  try {
    const auth = req.headers.get('authorization') || '';
    if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ ok:false, error:'Unauthorized' }, { status: 401 });
    }

    // Lee filtros opcionales del cron/Action: ?bank=banesco&amountVES=500000
    const u = new URL(req.url);
    const bank = (u.searchParams.get('bank') || '').toLowerCase();
    const amountVES = Number(u.searchParams.get('amountVES') || '0') || 0;

    const results = {};
    results.p2p = await taskP2PSample({ bank, amountVES });

    return NextResponse.json({ ok:true, results, ts: new Date().toISOString() }, { headers:{ 'Cache-Control':'no-store' } });
  } catch (e) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 500 });
  }
}

