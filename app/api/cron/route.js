// app/api/cron/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const CRON_SECRET = process.env.CRON_SECRET;

function assertEnv() {
  const missing = [];
  if (!SB_URL) missing.push('SUPABASE_URL');
  if (!SB_SERVICE_ROLE) missing.push('SUPABASE_SERVICE_ROLE');
  if (!CRON_SECRET) missing.push('CRON_SECRET');
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }
}

function sbHeaders(json = true) {
  const h = { apikey: SB_SERVICE_ROLE, Authorization: `Bearer ${SB_SERVICE_ROLE}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

const BINANCE_P2P_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';
// Headers tipo navegador para evitar respuestas vacías
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

function num(x) {
  const n = Number(String(x).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}
function median(sortedArr) {
  const n = sortedArr.length;
  if (!n) return null;
  const mid = Math.floor(n / 2);
  return n % 2 ? sortedArr[mid] : (sortedArr[mid - 1] + sortedArr[mid]) / 2;
}

// Fetch P2P lado específico (BUY / SELL) con filtro opcional por banco y monto
async function p2pFetch(side, { bank, amountVES } = {}) {
  const body = {
    asset: 'USDT',
    fiat: 'VES',
    tradeType: side, // 'BUY' o 'SELL'
    page: 1,
    rows: 50,
    publisherType: null,
    payTypes: [] // aplicaremos filtros abajo
  };
  const r = await fetch(BINANCE_P2P_URL, {
    method: 'POST',
    headers: B_HEADERS,
    body: JSON.stringify(body),
    next: { revalidate: 0 },
    cache: 'no-store'
  });
  if (!r.ok) throw new Error(`Binance ${side} ${r.status}`);
  const j = await r.json();
  let data = Array.isArray(j?.data) ? j.data : [];

  // Filtrado opcional lado servidor
  const bankLc = bank ? String(bank).toLowerCase() : '';
  const amt = Number(amountVES || 0) || 0;

  if (bankLc) {
    data = data.filter(d => {
      const methods = d?.tradeMethods || [];
      return methods.some(m => String(m?.tradeMethodName || '').toLowerCase().includes(bankLc));
    });
  }

  if (amt) {
    data = data.filter(d => {
      const min = num(d?.adv?.minSingleTransAmount);
      const max = num(d?.adv?.maxSingleTransAmount);
      if (min != null && amt < min) return false;
      if (max != null && amt > max) return false;
      return true;
    });
  }

  const prices = data
    .map(d => num(d?.adv?.price))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (!prices.length) return { n: 0, median: null };
  return { n: prices.length, median: median(prices) };
}

export async function GET(req) {
  try {
    assertEnv();

    // Autorización del cron (por ejemplo via Vercel Cron)
    const auth = req.headers.get('authorization') || '';
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parámetros opcionales (permiten capturar perfiles específicos)
    // Ej: /api/cron?bank=banesco&amountVES=350000
    const u = new URL(req.url);
    const bankParam = (u.searchParams.get('bank') || '').toLowerCase();
    const amountVESParam = Number(u.searchParams.get('amountVES') || '0') || 0;

    // Captura BUY/SELL
    const [buy, sell] = await Promise.all([
      p2pFetch('BUY',  { bank: bankParam, amountVES: amountVESParam }),
      p2pFetch('SELL', { bank: bankParam, amountVES: amountVESParam }),
    ]);

    // Cálculos mapeados a tu semántica:
    // eff_sell = mediana de BUY (cliente compra USDT)
    // eff_buy  = mediana de SELL (cliente vende USDT)
    const eff_sell = buy.median;
    const eff_buy = sell.median;

    // Si no hay precios en alguno de los lados, evita insertar basura
    if (eff_sell == null || eff_buy == null) {
      return NextResponse.json({
        ok: false,
        error: 'Sin suficientes datos del feed (BUY o SELL vacío)',
        detail: { n_buy: buy.n, n_sell: sell.n }
      }, { status: 502 });
    }

    const spread = eff_sell - eff_buy;
    const n = Math.min(buy.n, sell.n);

    // Inserción en tabla base.
    // Por defecto: global (bank=null, amount_ves=null) → bucket '*' disponible.
    // Si pasas parámetros, insertamos con dimensiones para poblar esos buckets también.
    const payload = {
      scope: 'public',
      eff_buy,
      eff_sell,
      spread,
      n,
      bank: bankParam ? bankParam : null,
      amount_ves: amountVESParam ? amountVESParam : null
    };

    const ins = await fetch(`${SB_URL}/rest/v1/p2p_monitor_samples?select=*`, {
      method: 'POST',
      headers: { ...sbHeaders(true), Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    });
    if (!ins.ok) {
      return NextResponse.json({ ok: false, error: await ins.text() }, { status: 502 });
    }
    const [saved] = await ins.json();

    return NextResponse.json({
      ok: true,
      saved,
      metrics: { eff_buy, eff_sell, spread, n, n_buy: buy.n, n_sell: sell.n },
      params: { bank: payload.bank, amount_ves: payload.amount_ves },
      ts: new Date().toISOString()
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}