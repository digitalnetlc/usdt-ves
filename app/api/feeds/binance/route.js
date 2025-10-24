// app/api/feeds/binance/route.js
import { NextResponse } from 'next/server';

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

async function binanceFetch(side) {
  const body = {
    asset: 'USDT',
    fiat: 'VES',
    tradeType: side,  // 'BUY' (tú compras USDT) | 'SELL' (tú vendes USDT)
    page: 1,
    rows: 50,
    publisherType: null,
    payTypes: []      // NO filtramos aquí; filtraremos client-side por nombre de banco
  };
  const r = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(body),
    next:{ revalidate:0 }
  });
  if (!r.ok) throw new Error(`Binance ${side} ${r.status}`);
  const j = await r.json();
  return Array.isArray(j?.data) ? j.data : [];
}

function num(x){ const n = Number(x); return Number.isFinite(n) ? n : null; }
function inAmountRange(adv, amountVES) {
  if (!amountVES) return true;
  const min = num(adv.minSingleTransAmount);
  const max = num(adv.maxSingleTransAmount);
  if (min!=null && amountVES < min) return false;
  if (max!=null && amountVES > max) return false;
  return true;
}
function matchesBank(adv, bankQuery) {
  if (!bankQuery) return true;
  const q = bankQuery.toLowerCase();
  const methods = adv?.tradeMethods || [];
  return methods.some(m => String(m?.tradeMethodName||'').toLowerCase().includes(q));
}
function pct(arr, p){
  if (!arr.length) return null;
  if (arr.length === 1) return arr[0];
  const idx = (arr.length-1)*p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return arr[lo];
  return arr[lo] + (arr[hi]-arr[lo])*(idx-lo);
}

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const u = new URL(req.url);
    // side=both | buy | sell
    // bank=banesco|mercantil|... (coincidencia por nombre contiene)
    // amountVES= (número en VES para filtrar rango)
    const sideParam   = (u.searchParams.get('side') || 'both').toLowerCase();
    const bankFilter  = u.searchParams.get('bank') || '';
    const amountVES   = Number(u.searchParams.get('amountVES') || '0') || 0;

    const wantBuy  = sideParam === 'both' || sideParam === 'buy';
    const wantSell = sideParam === 'both' || sideParam === 'sell';

    const [rawBuy, rawSell] = await Promise.all([
      wantBuy  ? binanceFetch('BUY')  : Promise.resolve([]),
      wantSell ? binanceFetch('SELL') : Promise.resolve([]),
    ]);

    // Filtra por banco y monto
    const filterFn = (d)=> matchesBank(d.adv, bankFilter) && inAmountRange(d.adv, amountVES);
    const buyRows  = wantBuy  ? rawBuy.filter(filterFn)  : [];
    const sellRows = wantSell ? rawSell.filter(filterFn) : [];

    // Extrae precios numéricos y ordénalos
    const buyPrices  = buyRows .map(d=>num(d?.adv?.price)).filter(Number.isFinite).sort((a,b)=>a-b);
    const sellPrices = sellRows.map(d=>num(d?.adv?.price)).filter(Number.isFinite).sort((a,b)=>a-b);

    const buyMedian  = buyPrices .length ? pct(buyPrices, 0.5) : null;
    const sellMedian = sellPrices.length ? pct(sellPrices,0.5) : null;

    // Convención:
    // - Binance "BUY": tú pagas VES y recibes USDT -> referencia de nuestro eff_sell (precio más alto).
    // - Binance "SELL": tú entregas USDT y recibes VES -> referencia de nuestro eff_buy (precio más bajo).
    const eff_sell = buyMedian;        // para COMPRAR USDT
    const eff_buy  = sellMedian;       // para VENDER USDT
    const spread   = (eff_sell!=null && eff_buy!=null) ? (eff_sell - eff_buy) : null;

    const payload = {
      params: { bank: bankFilter || null, amountVES: amountVES || null, side: sideParam },
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
