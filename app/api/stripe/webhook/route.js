import Stripe from 'stripe';

export const runtime = 'nodejs'; // importante para raw body

export async function POST(req) {
  try {
    const sig = req.headers.get('stripe-signature');
    if (!sig) {
      // Si no viene firma, no es Stripe (o prueba manual con curl)
      return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 400 });
    }

    const buf = Buffer.from(await req.arrayBuffer());
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    let event;
    try {
      event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return new Response(JSON.stringify({ error: `Invalid signature: ${err.message}` }), { status: 400 });
    }

    // (Opcional) logs para ver en Vercel
    console.log('[stripe-webhook]', event.type, event.id);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.order_id;

      // Aquí puedes actualizar la orden si existe (Supabase), pero aunque no exista, responde 200.
      // try { await patchOrder(orderId, { status: 'paid', payment_intent_id: String(session.payment_intent) }); } catch {}
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      const orderId = (pi.metadata ?? {}).order_id;
      // try { await patchOrder(orderId, { status: 'failed' }); } catch {}
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e) {
    console.error('[stripe-webhook] error', e);
    return new Response(JSON.stringify({ error: 'Webhook error' }), { status: 500 });
  }
}

// Permite el preflight de Stripe si llega a enviar OPTIONS
export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
