// app/api/feeds/binance/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

const ALLOWED = (process.env.CORS_ORIGIN ?? '').split(',').map(s=>s.trim()).filter(Boolean);

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
export function OPTIONS(req){ return withCORS(req, new NextResponse(null,{status:204})); }

const ENDPOINT = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

// headers “de navegador” para que Binance no devuelva vacío
const B_HEADERS = {
  'content-type': 'application/json',
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'es-ES,es;q=0.9',
  'cache-control': 'no-cache',
  'pragma': 'no-cache',
  'origin': 'https://p2p.binance.com',
  'referer': 'https://p2p.binance.com/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
};

async function binanceFetch(side) {
  const body = {
    asset: 'USDT',
    fiat: 'VES',
    tradeType: side, // BUY o SELL
    page: 1,
    rows: 50,
    publisherType: null,
    payTypes: []     // filtramos bancos client-side
  };
  const r = await fetch(ENDPOINT, {
    method:'POST',
    headers: B_HEADERS,
    body: JSON.stringify(body),
    next:{ revalidate:0 }
  });
  if (!r.ok) throw new Error(`Binance ${side} ${r.status}`);
  const j = await r.json();
  return Array.isArray(j?.data) ? j.data : [];
}

function num(x){ const n = Number(String(x).replace(/,/g,'')); return Number.isFinite(n) ? n : null; }
function pct(arr, p){
  if (!arr.length) return null;
  const idx = (arr.length-1)*p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return arr[lo];
  return arr[lo] + (arr[hi]-arr[lo])*(idx-lo);
}
function matchesBank(adv, q) {
  if (!q) return true;
  const qi = q.toLowerCase();
  const methods = adv?.tradeMethods || [];
  return methods.some(m => String(m?.tradeMethodName||'').toLowerCase().includes(qi));
}
function amountInRange(adv, amountVES) {
  if (!amountVES) return true;
  const min = num(adv.minSingleTransAmount);
  const max = num(adv.maxSingleTransAmount);
  if (min!=null && amountVES < min) return false;
  if (max!=null && amountVES > max) return false;
  return true;
}

export async function GET(req) {
  try {
    const u = new URL(req.url);
    const sideParam  = (u.searchParams.get('side') || 'both').toLowerCase();
    const bank       = u.searchParams.get('bank') || '';
    const amountVES  = Number(u.searchParams.get('amountVES') || '0') || 0;

    const wantBuy  = sideParam === 'both' || sideParam === 'buy';
    const wantSell = sideParam === 'both' || sideParam === 'sell';

    const [rawBuy, rawSell] = await Promise.all([
      wantBuy  ? binanceFetch('BUY')  : Promise.resolve([]),
      wantSell ? binanceFetch('SELL') : Promise.resolve([]),
    ]);

    const filterFn = d => matchesBank(d.adv, bank) && amountInRange(d.adv, amountVES);
    const buyRows  = rawBuy .filter(filterFn);
    const sellRows = rawSell.filter(filterFn);

    const buyPrices  = buyRows .map(d => num(d?.adv?.price)).filter(Number.isFinite).sort((a,b)=>a-b);
    const sellPrices = sellRows.map(d => num(d?.adv?.price)).filter(Number.isFinite).sort((a,b)=>a-b);

    const eff_sell = buyPrices .length ? pct(buyPrices, 0.5) : null; // comprar USDT
    const eff_buy  = sellPrices.length ? pct(sellPrices,0.5) : null; // vender USDT
    const spread   = (eff_sell!=null && eff_buy!=null) ? eff_sell - eff_buy : null;

    const payload = {
      params: { bank: bank || null, amountVES: amountVES || null, side: sideParam },
      n_buy:  buyPrices.length,
      n_sell: sellPrices.length,
      eff_sell,
      eff_buy,
      spread,
      p25_sell: buyPrices .length ? pct(buyPrices, .25) : null,
      p75_sell: buyPrices .length ? pct(buyPrices, .75) : null,
      p25_buy:  sellPrices.length ? pct(sellPrices,.25) : null,
      p75_buy:  sellPrices.length ? pct(sellPrices,.75) : null,
      ts: new Date().toISOString()
    };

    return withCORS(req, NextResponse.json(payload, { headers:{ 'Cache-Control':'no-store' }}));
  } catch (e) {
    return withCORS(req, NextResponse.json({ error: String(e?.message||e) }, { status: 500 }));
  }
}
