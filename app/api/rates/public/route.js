import { NextResponse } from 'next/server';

const ALLOWED = (process.env.CORS_ORIGIN ?? '')
  .split(',').map(s=>s.trim()).filter(Boolean);

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

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    // … tu lógica de tasas …
    const payload = { ok: true, msg: 'API vivo' };
    return withCORS(req, NextResponse.json(payload, { headers: { 'Cache-Control':'no-store' } }));
  } catch (e) {
    return withCORS(req, NextResponse.json({ error: String(e.message || e) }, { status: 500 }));
  }
}
