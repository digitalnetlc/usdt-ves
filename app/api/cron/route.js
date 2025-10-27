// app/api/cron/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

// Env vars
const SB_URL = process.env.SUPABASE_URL || process.env.SUPABASE_REST_URL; // acepta cualquiera
const SB_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const CRON_SECRET = process.env.CRON_SECRET;

// Utilidades
function assertEnv() {
  const missing = [];
  if (!SB_URL) missing.push('SUPABASE_URL/SUPABASE_REST_URL');
  if (!SB_SERVICE_ROLE) missing.push('SUPABASE_SERVICE_ROLE');
  if (!CRON_SECRET) missing.push('CRON_SECRET');
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }
  // Validar URL base
  const base = (SB_URL || '').trim();
  if (!/^https?:\/\//i.test(base)) {
    throw new Error(`SUPABASE_URL inválida: "${SB_URL}"`);
  }
}

function sbHeaders(json = true) {
  const h = {
    apikey: SB_SERVICE_ROLE,
    Authorization: `Bearer ${SB_SERVICE_ROLE}`,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

// Endpoint oficial de Binance P2P
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
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
};

function num(x) {
  const n = Number(String(x ?? '').replace(/,/g, ''));
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
  // Nota: El filtro por banco y monto lo aplicamos post-fetch para robustez
  const body = {
    asset: 'USDT',
    fiat: 'VES',
    tradeType: side, // 'BUY' o 'SELL'
    page: 1,
    rows: 50,
    publisherType: null,
    payTypes: [], // filtraremos luego
  };

  const r = await fetch(BINANCE_P2P_URL, {
    method: 'POST',
    headers: B_HEADERS,
    body: JSON.stringify(body),
    next: { revalidate: 0 },
    cache: 'no-store',
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Binance ${side} ${r.status} ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  let data = Array.isArray(j?.data) ? j.data : [];

  // Filtrado opcional lado servidor
  const bankLc = bank ? String(bank).trim().toLowerCase() : '';
  const amt = Number(amountVES || 0) || 0;

  if (bankLc) {
    data = data.filter((d) => {
      const methods = d?.tradeMethods || [];
      return methods.some((m) =>
        String(m?.tradeMethodName || '').toLowerCase().includes(bankLc)
      );
    });
  }

  if (amt) {
    data = data.filter((d) => {
      const min = num(d?.adv?.minSingleTransAmount);
      const max = num(d?.adv?.maxSingleTransAmount);
      if (min != null && amt < min) return false;
      if (max != null && amt > max) return false;
      return true;
    });
  }

  const prices = data
    .map((d) => num(d?.adv?.price))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (!prices.length) return { n: 0, median: null, prices: [] };
  return { n: prices.length, median: median(prices), prices };
}

// CORS mínimo (para pruebas manuales)
function corsHeaders(origin = '*') {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, OPTIONS',
    'cache-control': 'no-store',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders('*') });
}

export async function GET(req) {
  try {
    assertEnv();

    // Autorización del cron (por ejemplo via GitHub Actions o Vercel Cron)
    const auth = req.headers.get('authorization') || '';
    const expected = `Bearer ${CRON_SECRET}`;
    if (auth !== expected) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401, headers: corsHeaders('*') }
      );
    }

    // Parámetros opcionales para capturas dirigidas
    // Ej: /api/cron?bank=banesco&amountVES=350000
    const u = new URL(req.url);
    const bankParam = (u.searchParams.get('bank') || '').toLowerCase();
    const amountVESParam = Number(u.searchParams.get('amountVES') || '0') || 0;

    // Captura BUY/SELL en paralelo
    const [buy, sell] = await Promise.all([
      p2pFetch('BUY', { bank: bankParam, amountVES: amountVESParam }),
      p2pFetch('SELL', { bank: bankParam, amountVES: amountVESParam }),
    ]);

    // Semántica:
    // eff_sell = mediana de BUY (cliente compra USDT => nosotros vendemos)
    // eff_buy  = mediana de SELL (cliente vende USDT => nosotros compramos)
    const eff_sell = buy.median;
    const eff_buy = sell.median;

    // Validación de datos
    if (eff_sell == null || eff_buy == null) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Sin suficientes datos del feed (BUY o SELL vacío)',
          detail: { n_buy: buy.n, n_sell: sell.n },
        },
        { status: 502, headers: corsHeaders('*') }
      );
    }

    const spread = eff_sell - eff_buy;
    const n = Math.min(buy.n, sell.n);

    // Inserción en tabla base
    // Tabla: p2p_monitor_samples
    const payload = {
      scope: 'public',
      eff_buy,
      eff_sell,
      spread,
      n,
      bank: bankParam ? bankParam : null,
      amount_ves: amountVESParam ? amountVESParam : null,
    };

    const insertUrl = new URL('/rest/v1/p2p_monitor_samples', SB_URL);
    insertUrl.searchParams.set('select', '*');

    const ins = await fetch(insertUrl, {
      method: 'POST',
      headers: { ...sbHeaders(true), Prefer: 'return=representation' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!ins.ok) {
      const body = await ins.text();
      return NextResponse.json(
        { ok: false, error: 'supabase_insert_failed', status: ins.status, body },
        { status: 502, headers: corsHeaders('*') }
      );
    }

    const [saved] = await ins.json();

    return NextResponse.json(
      {
        ok: true,
        saved,
        metrics: {
          eff_buy,
          eff_sell,
          spread,
          n,
          n_buy: buy.n,
          n_sell: sell.n,
        },
        params: { bank: payload.bank, amount_ves: payload.amount_ves },
        ts: new Date().toISOString(),
      },
      { headers: corsHeaders('*') }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500, headers: corsHeaders('*') }
    );
  }
}