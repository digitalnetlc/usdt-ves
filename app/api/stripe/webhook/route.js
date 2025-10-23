import Stripe from 'stripe';

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

function sbHeaders(json = true) {
  const h = {
    apikey: SB_SERVICE_ROLE,
    Authorization: `Bearer ${SB_SERVICE_ROLE}`,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function patchOrder(id, patch) {
  if (!id) return;
  await fetch(`${SB_URL}/rest/v1/orders?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...sbHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
}

async function logOrderEvent(order_id, type, payload) {
  if (!order_id) return;
  await fetch(`${SB_URL}/rest/v1/order_events`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify({ order_id, type, payload }),
  });
}

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const sig = req.headers.get('stripe-signature');
    if (!sig) return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 400 });

    const buf = Buffer.from(await req.arrayBuffer());
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    let event;
    try {
      event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return new Response(JSON.stringify({ error: `Invalid signature: ${err.message}` }), { status: 400 });
    }

    // Logs opcionales
    console.log('[stripe-webhook]', event.type, event.id);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.order_id || null;

      // Update order -> paid
      await patchOrder(orderId, { status: 'paid', payment_intent_id: String(session.payment_intent || '') });
      await logOrderEvent(orderId, 'webhook', { type: event.type, session_id: session.id });
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      const orderId = (pi.metadata ?? {}).order_id || null;
      await patchOrder(orderId, { status: 'failed' });
      await logOrderEvent(orderId, 'webhook', { type: event.type, pi_id: pi.id });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    console.error('[stripe-webhook] error', e);
    return new Response(JSON.stringify({ error: 'Webhook error' }), { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
