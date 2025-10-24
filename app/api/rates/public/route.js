// app/api/rates/public/route.js
import { NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const ALLOWED = (process.env.CORS_ORIGIN ?? '').split(',').map(s=>s.trim()).filter(Boolean);

function sbHeaders(json = false) {
  const h = { apikey: SB_SERVICE_ROLE, Authorization: `Bearer ${SB_SERVICE_ROLE}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}
function withCORS(req, res) {
  const origin = req.headers.get('origin') ?? '';
  if (ALLOWED.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
  }
  res.headers.set('Access-Control-Allow-Methods','GET,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers','Content-Type,Authorization');
  return res;
}

export async function OPTIONS(req) {
  return withCORS(req, new NextResponse(null, { status: 204 }));
}

export const runtime = 'nodejs';

// --- util: mediana segura
function median(values) {
  const arr = values.slice().sort((a,b)=>a-b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length/2);
  return arr.length % 2 ? arr[mid] : (arr[mid-1]+arr[mid])/2;
}

// --- fallback rápido a Binance P2P
async function fetchBinancePair() {
  async function p2p(side){
    const body = { asset:'USDT', fiat:'VES', tradeType: side, page:1, rows:30, publisherType:null, payTypes:[] };
    const r = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
      method:'POST', headers:{ 'Content-Type':'application/json', 'cache-control':'no-cache' },
      body: JSON.stringify(body), next:{ revalidate: 0 }
    });
    if (!r.ok) throw new Error(`Binance ${side} ${r.status}`);
    const j = await r.json();
    const prices = (j?.data ?? []).map(d=>Number(d?.adv?.price)).filter(Number.isFinite);
    const m = median(prices);
    return { n: prices.length, median: m };
  }
  const [sell, buy] = await Promise.all([ p2p('BUY'), p2p('SELL') ]);
  // Nota: P2P "BUY" → nuestro eff_sell; "SELL" → nuestro eff_buy
  return { eff_sell: sell.median, eff_buy: buy.median, spread: sell.median - buy.median, n: Math.min(sell.n, buy.n) };
}

export async function GET(req) {
  try {
    const url = new URL(req.url);

    // 1) spread (query > BD > 8)
    let spread = Number(url.searchParams.get('spread') ?? NaN);
    if (!Number.isFinite(spread)) {
      try {
        const r = await fetch(`${SB_URL}/rest/v1/rates_config?id=eq.true&select=spread`, { headers: sbHeaders() });
        if (r.ok) { const [row] = await r.json(); if (row?.spread != null) spread = Number(row.spread); }
      } catch {}
    }
    if (!Number.isFinite(spread)) spread = 8;

    // 2) intenta último punto en v_p2p_monitor_1m (ventana 30 min)
    const since = new Date(Date.now() - 30*60*1000).toISOString();
    const q = new URL(`${SB_URL}/rest/v1/v_p2p_monitor_1m`);
    q.searchParams.set('select','t_min,eff_buy,eff_sell,spread,n');
    q.searchParams.set('scope','eq.public');
    q.searchParams.set('t_min',`gte.${since}`);
    q.searchParams.set('order','t_min.desc');
    q.searchParams.set('limit','1');

    let baseBuy, baseSell, ts;
    let gotFromSupabase = false;

    try {
      const r2 = await fetch(q.toString(), { headers: sbHeaders(), cache: 'no-store' });
      if (r2.ok) {
        const rows = await r2.json();
        if (rows?.length) {
          const last = rows[0];
          baseBuy  = Number(last.eff_buy);
          baseSell = Number(last.eff_sell);
          ts = last.t_min;
          gotFromSupabase = true;
        }
      }
    } catch {}

    // 3) si no hubo datos recientes, fallback a Binance (y opcionalmente guarda muestra)
    if (!gotFromSupabase) {
      const live = await fetchBinancePair();
      if (!Number.isFinite(live.eff_buy) || !Number.isFinite(live.eff_sell)) {
        return withCORS(req, NextResponse.json({ error: 'Sin datos en Binance' }, { status: 502 }));
      }
      baseBuy  = live.eff_buy;
      baseSell = live.eff_sell;
      ts = new Date().toISOString();

      // (opcional) intenta insertar una muestra para que el monitor tenga puntos
      try {
        await fetch(`${SB_URL}/rest/v1/p2p_monitor_samples?select=*`, {
          method:'POST', headers:{ ...sbHeaders(true), Prefer:'return=representation' },
          body: JSON.stringify({ scope:'public', eff_buy: baseBuy, eff_sell: baseSell, spread: live.spread, n: live.n })
        });
      } catch {}
    }

    // 4) computa ejecutables con spread
    const k = 1 + Number(spread)/100;
    const payload = {
      ts,
      spread_pct: Number(spread),
      base: { buy: baseBuy, sell: baseSell },
      executable: {
        buy:  baseBuy / k,   // VES/USDT cuando cliente VENDE USDT
        sell: baseSell * k   // VES/USDT cuando cliente COMPRA USDT
      },
      source: gotFromSupabase ? 'supabase' : 'binance_fallback'
    };

    return withCORS(req, NextResponse.json(payload, { headers: { 'Cache-Control':'no-store' } }));
  } catch (e) {
    return withCORS(req, NextResponse.json({ error: String(e?.message || e) }, { status: 500 }));
  }
}
