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

async function p2pFetch({ side }) {
  // side: 'BUY' => tú quieres COMPRAR USDT (vendedores postean ofertas)
  //       'SELL'=> tú quieres VENDER USDT (compradores postean ofertas)
  const body = {
    asset: 'USDT',
    fiat: 'VES',
    tradeType: side,             // BUY o SELL
    page: 1,
    rows: 30,                    // toma top 30
    publisherType: null,
    payTypes: []                 // podemos filtrar bancos si quieres
  };
  const r = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
    method: 'POST',
    headers: {
      'Content-Type':'application/json',
      'cache-control':'no-cache',
    },
    body: JSON.stringify(body),
    // Evita cache del edge
    next: { revalidate: 0 }
  });
  if (!r.ok) throw new Error(`Binance ${side} ${r.status}`);
  const j = await r.json();
  const prices = (j?.data ?? [])
    .map(d => Number(d?.adv?.price))
    .filter(v => Number.isFinite(v));
  prices.sort((a,b)=>a-b);
  if (!prices.length) throw new Error(`Sin precios ${side}`);
  const mid = prices.length % 2
    ? prices[(prices.length-1)/2]
    : (prices[prices.length/2-1] + prices[prices.length/2]) / 2;
  return { side, n: prices.length, median: mid, sample: prices.slice(0,10) };
}

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const [sell, buy] = await Promise.all([
      p2pFetch({ side:'BUY'  }), // usuarios compran USDT -> referencia para nuestro eff_sell
      p2pFetch({ side:'SELL' })  // usuarios venden USDT -> referencia para nuestro eff_buy
    ]);
    // Nota: en P2P "BUY" significa tú pagas VES y recibes USDT → precio alto (eff_sell).
    //       en P2P "SELL" es al revés → precio bajo (eff_buy).
    const payload = {
      eff_sell: sell.median,
      eff_buy:  buy.median,
      spread:   sell.median - buy.median,
      n_sell:   sell.n,
      n_buy:    buy.n,
      ts: new Date().toISOString()
    };
    return withCORS(req, NextResponse.json(payload, { headers:{'Cache-Control':'no-store'} }));
  } catch (e) {
    return withCORS(req, NextResponse.json({ error: String(e?.message||e) }, { status: 500 }));
  }
}
