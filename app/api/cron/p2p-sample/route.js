// app/api/cron/p2p-sample/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const CRON_SECRET = process.env.CRON_SECRET;

// --- Helpers ---
function sbHeaders(json = true) {
  const h = { apikey: SB_SERVICE_ROLE, Authorization: `Bearer ${SB_SERVICE_ROLE}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function p2pFetch(side) {
  // side: 'BUY' (precio para COMPRAR USDT) o 'SELL' (precio para VENDER USDT)
  const body = {
    asset: 'USDT',
    fiat: 'VES',
    tradeType: side,
    page: 1,
    rows: 30,
    publisherType: null,
    payTypes: []
  };
  const r = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cache-control': 'no-cache' },
    body: JSON.stringify(body),
    next: { revalidate: 0 }
  });
  if (!r.ok) throw new Error(`Binance ${side} ${r.status}`);
  const j = await r.json();
  const prices = (j?.data ?? []).map(d => Number(d?.adv?.price)).filter(Number.isFinite).sort((a,b)=>a-b);
  if (!prices.length) throw new Error(`Sin precios ${side}`);
  const mid = prices.length % 2
    ? prices[(prices.length - 1) / 2]
    : (prices[prices.length/2 - 1] + prices[prices.length/2]) / 2;
  return { n: prices.length, median: mid };
}

// --- Handlers ---
export async function GET(req) {
  try {
    // Auth del cron (recomendado por Vercel)
    const auth = req.headers.get('authorization') || '';
    if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 1) Feed real
    const [buy, sell] = await Promise.all([
      p2pFetch('SELL'), // Usuarios venden USDT -> referencia para nuestro eff_buy
      p2pFetch('BUY')   // Usuarios compran USDT -> referencia para nuestro eff_sell
    ]);

    const eff_buy  = buy.median;   // VES/USDT (cuando cliente VENDE USDT)
    const eff_sell = sell.median;  // VES/USDT (cuando cliente COMPRA USDT)
    const spread   = eff_sell - eff_buy;
    const n        = Math.min(buy.n, sell.n);

    // 2) Insertar muestra
    const ins = await fetch(`${SB_URL}/rest/v1/p2p_monitor_samples?select=*`, {
      method: 'POST',
      headers: { ...sbHeaders(), Prefer: 'return=representation' },
      body: JSON.stringify({ scope: 'public', eff_buy, eff_sell, spread, n })
    });
    if (!ins.ok) throw new Error(await ins.text());
    const [saved] = await ins.json();

    return NextResponse.json({ ok: true, saved }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
