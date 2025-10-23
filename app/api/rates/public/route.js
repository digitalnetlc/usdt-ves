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

export async function GET(req) {
  try {
    const url = new URL(req.url);
    // si te pasan ?spread=10 forzamos, si no tomamos rates_config.spread
    let spread = Number(url.searchParams.get('spread') ?? NaN);
    if (!Number.isFinite(spread)) {
      const r = await fetch(`${SB_URL}/rest/v1/rates_config?id=eq.true&select=spread`, { headers: sbHeaders() });
      if (r.ok) {
        const [row] = await r.json();
        if (row?.spread != null) spread = Number(row.spread);
      }
    }
    if (!Number.isFinite(spread)) spread = 8;

    // último punto agg (ventana 30min por seguridad)
    const since = new Date(Date.now() - 30*60*1000).toISOString();
    const q = new URL(`${SB_URL}/rest/v1/v_p2p_monitor_1m`);
    q.searchParams.set('select','t_min,eff_buy,eff_sell,spread,n');
    q.searchParams.set('scope','eq.public');
    q.searchParams.set('t_min',`gte.${since}`);
    q.searchParams.set('order','t_min.desc');
    q.searchParams.set('limit','1');

    const r2 = await fetch(q.toString(), { headers: sbHeaders(), cache: 'no-store' });
    if (!r2.ok) {
      return withCORS(req, NextResponse.json({ error: `Supabase error (${r2.status})` }, { status: 502 }));
    }
    const rows = await r2.json();
    if (!rows?.length) {
      return withCORS(req, NextResponse.json({ error: 'No hay datos recientes en v_p2p_monitor_1m' }, { status: 404 }));
    }

    const last = rows[0];
    const baseBuy  = Number(last.eff_buy);
    const baseSell = Number(last.eff_sell);
    const k = 1 + Number(spread)/100;

    const payload = {
      ts: last.t_min,
      spread_pct: Number(spread),
      base: { buy: baseBuy, sell: baseSell },
      executable: {
        buy:  baseBuy / k,   // VES/USDT cuando cliente VENDE USDT
        sell: baseSell * k   // VES/USDT cuando cliente COMPRA USDT
      }
    };

    return withCORS(req, NextResponse.json(payload, { headers: { 'Cache-Control':'no-store' } }));
  } catch (e) {
    return withCORS(req, NextResponse.json({ error: String(e?.message || e) }, { status: 500 }));
  }
}
