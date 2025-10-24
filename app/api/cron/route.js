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

async function taskP2PSample() {
  // BUY (usuario compra USDT) → referencia eff_sell
  // SELL (usuario vende USDT) → referencia eff_buy
  const [buy, sell] = await Promise.all([ p2pFetch('SELL'), p2pFetch('BUY') ]);
  const eff_buy  = buy.median;
  const eff_sell = sell.median;
  const spread   = eff_sell - eff_buy;
  const n        = Math.min(buy.n, sell.n);

  const ins = await fetch(`${SB_URL}/rest/v1/p2p_monitor_samples?select=*`, {
    method:'POST',
    headers:{ ...sbHeaders(), Prefer:'return=representation' },
    body: JSON.stringify({ scope:'public', eff_buy, eff_sell, spread, n })
  });
  if (!ins.ok) throw new Error(await ins.text());
  const [saved] = await ins.json();
  return { saved };
}

// Si luego quieres más tareas, créalas así:
async function taskOtraCosa() {
  // ... lo que toque ...
  return { ok: true };
}

export async function GET(req) {
  try {
    // Protege tu cron (recomendado por Vercel)
    const auth = req.headers.get('authorization') || '';
    if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ ok:true, error:'Unauthorized' }, { status: 401 });
    }

    // Despacho de tareas (todas dentro del mismo cron)
    const results = {};
    // Ejecuta en serie para ser amable con los límites
    results.p2p = await taskP2PSample();
    // results.otro = await taskOtraCosa();

    return NextResponse.json({ ok:true, results, ts: new Date().toISOString() }, { headers:{ 'Cache-Control':'no-store' } });
  } catch (e) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 500 });
  }
}
