// app/api/orders/create/route.js

import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const SITE_URL = process.env.SITE_URL;
const CHECKOUT_CURRENCY = process.env.CHECKOUT_CURRENCY || 'usd';

const ALLOWED = (process.env.CORS_ORIGIN ?? '')
  .split(',').map(s=>s.trim()).filter(Boolean);

function withCORS(req, res) {
  const origin = req.headers.get('origin') ?? '';
  if (ALLOWED.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
  }
  res.headers.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  return res;
}
function sbHeaders(json=true){
  const h = { apikey: SB_SERVICE_ROLE, Authorization: `Bearer ${SB_SERVICE_ROLE}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

export async function OPTIONS(req) {
  return withCORS(req, new NextResponse(null, { status: 204 }));
}

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { amountFiat, walletAddress, spreadPct } = await req.json();
    if (!amountFiat || amountFiat < 1) {
      return withCORS(req, NextResponse.json({ error: 'Monto inválido' }, { status: 400 }));
    }
    if (!walletAddress || String(walletAddress).length < 8) {
      return withCORS(req, NextResponse.json({ error: 'Wallet inválida' }, { status: 400 }));
    }

    // 1) obtener spread (fallback a 8)
    let spread = Number(spreadPct ?? 8);
    try {
      const r = await fetch(`${SB_URL}/rest/v1/rates_config?id=eq.true&select=spread`, { headers: sbHeaders(false) });
      if (r.ok) { const [row] = await r.json(); if (row?.spread != null) spread = Number(row.spread); }
    } catch {}

    // 2) tasa base (último punto en v_p2p_monitor_1m)
    const since = new Date(Date.now() - 30*60*1000).toISOString();
    const q = new URL(`${SB_URL}/rest/v1/v_p2p_monitor_1m`);
    q.searchParams.set('select','t_min,eff_buy,eff_sell');
    q.searchParams.set('scope','eq.public');
    q.searchParams.set('t_min',`gte.${since}`);
    q.searchParams.set('order','t_min.desc');
    q.searchParams.set('limit','1');

    const r2 = await fetch(q.toString(), { headers: sbHeaders(false), cache:'no-store' });
    if (!r2.ok) {
      const txt = await r2.text();
      return withCORS(req, NextResponse.json({ error: `No rate available: ${txt}` }, { status: 502 }));
    }
    const arr = await r2.json();
    if (!arr?.length) return withCORS(req, NextResponse.json({ error: 'No rate row' }, { status: 502 }));

    const last = arr[0];
    const baseSell = Number(last.eff_sell);
    const k = 1 + spread/100;
    const rateExecSell = baseSell * k; // VES/USDT para comprar USDT

    // 3) crear orden
    const lock = new Date(Date.now() + 5*60*1000).toISOString();
    const orderBody = {
      side: 'BUY_USDT',
      fiat: 'VES',
      asset: 'USDT',
      amount_customer: Number(amountFiat),
      amount_counter: 0,
      rate_snapshot: rateExecSell,
      spread_applied: spread,
      lock_expires_at: lock,
      wallet_address: String(walletAddress),
      status: 'pending_payment'
    };
    const r3 = await fetch(`${SB_URL}/rest/v1/orders?select=*`, {
      method: 'POST', headers: { ...sbHeaders(), Prefer:'return=representation' },
      body: JSON.stringify(orderBody)
    });
    if (!r3.ok) {
      const txt = await r3.text();
      return withCORS(req, NextResponse.json({ error: `DB error: ${txt}` }, { status: 502 }));
    }
    const [order] = await r3.json();

    // 4) checkout
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    const amountMinor = Math.round(Number(amountFiat) * 100);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: CHECKOUT_CURRENCY,
      line_items: [{
        price_data: {
          currency: CHECKOUT_CURRENCY,
          unit_amount: amountMinor,
          product_data: { name: 'Compra USDT', description: `Orden ${order.id}` }
        },
        quantity: 1
      }],
      metadata: {
        order_id: order.id,
        rate_snapshot: String(rateExecSell),
        spread_pct: String(spread)
      },
      success_url: `${SITE_URL}/success.html?order=${order.id}`,
      cancel_url: `${SITE_URL}/cancel.html?order=${order.id}`
    });

    // guardar session id
    await fetch(`${SB_URL}/rest/v1/orders?id=eq.${order.id}`, {
      method: 'PATCH', headers: { ...sbHeaders(), Prefer:'return=representation' },
      body: JSON.stringify({ checkout_session_id: session.id })
    });

    return withCORS(req, NextResponse.json({ url: session.url }, { status: 200 }));
  } catch (e) {
    console.error('[orders/create] error', e);
    return withCORS(req, NextResponse.json({ error: String(e?.message || e) }, { status: 500 }));
  }
}
