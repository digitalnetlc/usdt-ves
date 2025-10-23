// app/api/monitor/route.js
import { NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const ALLOWED = (process.env.CORS_ORIGIN ?? '').split(',').map(s=>s.trim()).filter(Boolean);

function sbHeaders() {
  return {
    apikey: SB_SERVICE_ROLE,
    Authorization: `Bearer ${SB_SERVICE_ROLE}`
  };
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

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const rangeH = Math.max(1, Math.min(72, Number(url.searchParams.get('rangeH') ?? 24))); // 1..72
    const since = new Date(Date.now() - rangeH*60*60*1000).toISOString();

    const q = new URL(`${SB_URL}/rest/v1/v_p2p_monitor_1m`);
    q.searchParams.set('select', 't_min,eff_buy,eff_sell,spread,n,scope');
    q.searchParams.set('t_min', `gte.${since}`);
    q.searchParams.set('scope', 'eq.public');
    q.searchParams.set('order', 't_min.asc');

    const res = await fetch(q.toString(), { headers: sbHeaders(), cache: 'no-store' });
    if (!res.ok) {
      const txt = await res.text();
      return withCORS(req, NextResponse.json({ error: txt || 'Supabase error' }, { status: 502 }));
    }
    const rows = await res.json();

    // Estructura de salida para el front
    const data = rows.map(r => ({
      t: r.t_min,            // ISO
      buy: Number(r.eff_buy) || null,
      sell: Number(r.eff_sell) || null,
      spread: Number(r.spread) || null,
      n: Number(r.n) || 0
    }));

    return withCORS(req, NextResponse.json({
      rangeH,
      count: data.length,
      data
    }, { headers: { 'Cache-Control':'no-store' }}));
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
