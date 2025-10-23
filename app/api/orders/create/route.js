import Stripe from 'stripe';

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const SITE_URL = process.env.SITE_URL;
const CHECKOUT_CURRENCY = process.env.CHECKOUT_CURRENCY || 'usd';

function sbHeaders(json = true) {
  const h = {
    apikey: SB_SERVICE_ROLE,
    Authorization: `Bearer ${SB_SERVICE_ROLE}`,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function getLatestExecutable(spreadPct) {
  // spread desde rates_config si no viene
  let spread = spreadPct ?? 8;
  if (spreadPct == null) {
    const r = await fetch(`${SB_URL}/rest/v1/rates_config?id=eq.true&select=spread`, { headers: sbHeaders(false), cache: 'no-store' });
    if (r.ok) {
      const [row] = await r.json();
      if (row?.spread != null) spread = Number(row.spread);
    }
  }

  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const url = `${SB_URL}/rest/v1/v_p2p_monitor_1m?select=t_min,eff_buy,eff_sell&scope=eq.public&t_min=gte.${encodeURIComponent(since)}&order=t_min.desc&limit=1`;
  const res = await fetch(url, { headers: sbHeaders(false), cache: 'no-store' });
  if (!res.ok) throw new Error('No rate available');
  const arr = await res.json();
  if (!arr?.length) throw new Error('No rate row');

  const last = arr[0];
  const baseBuy = Number(last.eff_buy);
  const baseSell = Number(last.eff_sell);
  const k = 1 + spread / 100;

  return {
    ts: last.t_min,
    spread_pct: spread,
    base: { buy: baseBuy, sell: baseSell },
    executable: { buy: baseBuy / k, sell: baseSell * k },
  };
}

async function insertOrder(row) {
  const res = await fetch(`${SB_URL}/rest/v1/orders?select=*`, {
    method: 'POST',
    headers: { ...sbHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(await res.text());
  const [order] = await res.json();
  return order;
}

async function patchOrder(id, patch) {
  const res = await fetch(`${SB_URL}/rest/v1/orders?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...sbHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await res.text());
  const [row] = await res.json();
  return row;
}

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();
    const amountFiat = Number(body.amountFiat ?? 50);      // USD a cobrar en Stripe
    const walletAddress = String(body.walletAddress ?? '');
    const spreadPct = Number(body.spreadPct ?? 8);
    if (!walletAddress) throw new Error('Wallet requerida');

    // 1) tasa
    const rates = await getLatestExecutable(spreadPct);
    const lock = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 2) crear orden en Supabase
    const order = await insertOrder({
      side: 'BUY_USDT',
      fiat: 'VES',
      asset: 'USDT',
      amount_customer: amountFiat,
      amount_counter: 0,
      rate_snapshot: rates.executable.sell,
      spread_applied: spreadPct,
      lock_expires_at: lock,
      wallet_address: walletAddress,
      status: 'pending_payment',
    });

    // 3) Checkout (¡usa sk_test_... en STRIPE_SECRET_KEY!)
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    const amountMinor = Math.round(amountFiat * 100);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: CHECKOUT_CURRENCY,
      line_items: [{
        price_data: {
          currency: CHECKOUT_CURRENCY,
          unit_amount: amountMinor,
          product_data: {
            name: 'Compra USDT',
            description: `USDT/VES (spread ${spreadPct}%) – Orden ${order.id}`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        order_id: order.id,                     // <-- CLAVE: lo leerá el webhook
        side: 'BUY_USDT',
        spread_pct: String(spreadPct),
        rate_snapshot: String(rates.executable.sell),
      },
      success_url: `${SITE_URL}/success.html?order=${order.id}`,
      cancel_url: `${SITE_URL}/cancel.html?order=${order.id}`,
    });

    await patchOrder(order.id, { checkout_session_id: session.id });

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
