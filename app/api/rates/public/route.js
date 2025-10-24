// app/api/rates/public/route.js
import { NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const SITE_URL = process.env.SITE_URL || 'https://usdt-ves.vercel.app';
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
export async function OPTIONS(req){ return withCORS(req, new NextResponse(null,{status:204})); }
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const url = new URL(req.url);

    // 1) spread: ?spread => BD => 8
    let spread = Number(url.searchParams.get('spread') ?? NaN);
    if (!Number.isFinite(spread)) {
      try {
        const r = await fetch(`${SB_URL}/rest/v1/rates_config?id=eq.true&select=spread`, { headers: sbHeaders() });
        if (r.ok) { const [row] = await r.json(); if (row?.spread != null) spread = Number(row.spread); }
      } catch {}
    }
    if (!Number.isFinite(spread)) spread = 8;

    // 2) intenta última muestra (ampliamos la ventana a 90 min)
    const since = new Date(Date.now() - 90*60*1000).toISOString();
    const q = new URL(`${SB_URL}/rest/v1/v_p2p_monitor_1m`);
    q.searchParams.set('select','t_min,eff_buy,eff_sell,spread,n');
    q.searchParams.set('scope','eq.public');
    q.searchParams.set('t_min',`gte.${since}`);
    q.searchParams.set('order','t_min.desc');
    q.searchParams.set('limit','1');

    let baseBuy, baseSell, ts, source = 'supabase';
    try {
      const r2 = await fetch(q.toString(), { headers: sbHeaders(), cache: 'no-store' });
      if (r2.ok) {
        const rows = await r2.json();
        if (rows?.length) {
          const last = rows[0];
          baseBuy  = Number(last.eff_buy);
          baseSell = Number(last.eff_sell);
          ts = last.t_min;
        }
      }
    } catch {}

    // 3) si seguimos sin datos, usa tu propio feed y además inserta muestra
    if (!(Number.isFinite(baseBuy) && Number.isFinite(baseSell))) {
      const r = await fetch(`${SITE_URL}/api/feeds/binance`, { cache:'no-store' });
      const j = await r.json();
      if (!r.ok || !Number.isFinite(j?.eff_buy) || !Number.isFinite(j?.eff_sell)) {
        return withCORS(req, NextResponse.json({ error: 'Sin datos en Binance' }, { status: 502 }));
      }
      baseBuy  = Number(j.eff_buy);
      baseSell = Number(j.eff_sell);
      ts = j.ts || new Date().toISOString();
      source = 'binance_fallback';

      // Inserta para que el monitor tenga líneas
      try {
        await fetch(`${SB_URL}/rest/v1/p2p_monitor_samples?select=*`, {
          method:'POST',
          headers:{ ...sbHeaders(true), Prefer:'return=representation' },
          body: JSON.stringify({
            scope:'public', eff_buy: baseBuy, eff_sell: baseSell,
            spread: baseSell - baseBuy, n: Math.max(j.n_buy||0, j.n_sell||0)
          })
        });
      } catch {}
    }

    // 4) calcula ejecutables
    const k = 1 + (Number(spread)/100);
    const payload = {
      ts,
      spread_pct: Number(spread),
      base: { buy: baseBuy, sell: baseSell },
      executable: {
        buy:  baseBuy / k,   // VES/USDT cuando cliente VENDE USDT
        sell: baseSell * k   // VES/USDT cuando cliente COMPRA USDT
      },
      source
    };
    return withCORS(req, NextResponse.json(payload, { headers:{ 'Cache-Control':'no-store' }}));
  } catch (e) {
    return withCORS(req, NextResponse.json({ error: String(e?.message||e) }, { status: 500 }));
  }
}
