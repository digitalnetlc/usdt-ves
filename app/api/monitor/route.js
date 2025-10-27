// app/api/monitor/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

// CORS opcional
const ALLOWED = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function sbHeaders() {
  return { apikey: SB_SERVICE_ROLE, Authorization: `Bearer ${SB_SERVICE_ROLE}` };
}
function withCORS(req, res) {
  const origin = req.headers.get('origin') ?? '';
  if (ALLOWED.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  return res;
}
export async function OPTIONS(req) {
  return withCORS(req, new NextResponse(null, { status: 204 }));
}

function toBucket(amountVES) {
  if (!amountVES) return null; // null => sin filtro de bucket
  const v = Number(amountVES) || 0;
  if (v < 200000) return '<200k';
  if (v < 1000000) return '200k–1M';
  if (v < 5000000) return '1M–5M';
  return '≥5M';
}

async function getRows(rangeH, bank, amountVES) {
  const since = new Date(Date.now() - rangeH * 60 * 60 * 1000).toISOString();
  const q = new URL(`${SB_URL}/rest/v1/v_p2p_monitor_1m`);
  q.searchParams.set('select', 't_min,eff_buy,eff_sell,spread,n,bank,amount_bucket');
  q.searchParams.set('scope', 'eq.public');
  q.searchParams.set('t_min', `gte.${since}`);
  q.searchParams.set('order', 't_min.asc');

  if (bank) q.searchParams.set('bank', `eq.${bank}`);

  const bucket = toBucket(amountVES);
  if (bucket) {
    // Filtro sólo si hay monto → bucket explícito
    q.searchParams.set('amount_bucket', `eq.${encodeURIComponent(bucket)}`);
  } else {
    // Sin monto → NO filtrar por bucket (para traer data disponible)
    // q.searchParams.set('amount_bucket', 'eq.*'); // NO usar esto
  }

  const res = await fetch(q.toString(), { headers: sbHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function GET(req) {
  try {
    const u = new URL(req.url);
    const rangeH = Math.max(1, Math.min(72, Number(u.searchParams.get('rangeH') || 24)));
    const bank = (u.searchParams.get('bank') || '').toLowerCase();
    const amountVES = Number(u.searchParams.get('amountVES') || '0') || 0;

    let rows = await getRows(rangeH, bank, amountVES);

    // Fallback: si no hay filas, obtenemos un punto del feed, lo insertamos y reintentamos
    if (!rows.length) {
      const SITE = process.env.SITE_URL || (typeof window === 'undefined' ? '' : window.location.origin) || '';
      const base = SITE || ''; // si SITE_URL no está, asumimos mismo dominio
      const uf = new URL(`${base}/api/feeds/binance`);
      if (bank) uf.searchParams.set('bank', bank);
      if (amountVES) uf.searchParams.set('amountVES', String(amountVES));

      const r = await fetch(uf.toString(), { cache: 'no-store' });
      const j = await r.json();

      if (r.ok && Number.isFinite(j?.eff_buy) && Number.isFinite(j?.eff_sell)) {
        await fetch(`${SB_URL}/rest/v1/p2p_monitor_samples?select=*`, {
          method: 'POST',
          headers: { ...sbHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
          body: JSON.stringify({
            scope: 'public',
            eff_buy: j.eff_buy,
            eff_sell: j.eff_sell,
            spread: j.eff_sell - j.eff_buy,
            n: Math.min(j.n_buy || 0, j.n_sell || 0),
            bank: bank ? bank.toLowerCase() : null,        // normalizado
            amount_ves: amountVES || null                  // null si no se especifica monto → bucket '*'
          })
        });

        rows = await getRows(rangeH, bank, amountVES);
      }
    }

    const data = rows.map(r => ({
      t: r.t_min,
      buy: Number(r.eff_buy) || null,
      sell: Number(r.eff_sell) || null,
      spread: Number(r.spread) || null,
      n: Number(r.n) || 0
    }));

    return withCORS(req, NextResponse.json({ ok: true, rangeH, count: data.length, data }, {
      headers: { 'Cache-Control': 'no-store' }
    }));
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}