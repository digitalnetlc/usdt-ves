// app/api/monitor/route.js
// Runtime Node.js para evitar restricciones del Edge cuando llamamos a externos
export const runtime = 'nodejs';

// Utilidad para responder JSON consistente
function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

// CORS igual que arriba (puedes copiar withCORS)
const ALLOWED = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function withCORS(handler) {
  return async (req) => {
    const origin = req.headers.get('origin') || '';
    const isAllowed = !origin || ALLOWED.length === 0 || ALLOWED.includes(origin);

    // Preflight
    if (req.method === 'OPTIONS') {
      const h = new Headers();
      if (isAllowed) h.set('access-control-allow-origin', origin || '*');
      h.set('access-control-allow-headers', 'content-type, authorization');
      h.set('access-control-allow-methods', 'GET, OPTIONS');
      h.set('vary', 'origin');
      return new Response(null, { status: 204, headers: h });
    }

    // Llama al handler y añade cabeceras CORS
    const res = await handler(req);
    const headers = new Headers(res.headers);
    if (isAllowed) headers.set('access-control-allow-origin', origin || '*');
    headers.set('vary', 'origin');
    return new Response(res.body, { status: res.status, headers });
  };
}

// Mapea amount VES a bucket
function bucketFromAmount(amountVES) {
  if (!Number.isFinite(amountVES)) return undefined;
  if (amountVES < 200_000) return '<200k';
  if (amountVES < 1_000_000) return '200k–1M';
  if (amountVES < 5_000_000) return '1M–5M';
  return '≥5M';
}

export const GET = withCORS(async (req) => {
  try {
    const url = new URL(req.url);
    const sp = url.searchParams;

    const rangeH = Number(sp.get('rangeH') || '6');
    const bank = sp.get('bank') || undefined;
    const amountVES = sp.get('amountVES') ? Number(sp.get('amountVES')) : undefined;

    // Construye query a la vista en Supabase
    const sbUrl = new URL(`${process.env.SUPABASE_REST_URL}/v_p2p_monitor_1m`);
    sbUrl.searchParams.set('order', 't_min.asc');
    sbUrl.searchParams.set('select', 't_min,eff_buy,eff_sell,spread,bank,amount_bucket');

    // Filtros opcionales
    if (bank) sbUrl.searchParams.set('bank', `eq.${bank}`);
    const bucket = bucketFromAmount(amountVES);
    if (bucket) sbUrl.searchParams.set('amount_bucket', `eq.${encodeURIComponent(bucket)}`);

    // Rango de tiempo
    const since = new Date(Date.now() - rangeH * 3600 * 1000).toISOString();
    // PostgREST: gte.<value>
    sbUrl.searchParams.set('t_min', `gte.${since}`);

    // Llamada a Supabase REST
    const r = await fetch(sbUrl, {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE,
        authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`,
        accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!r.ok) {
      const body = await r.text();
      return json(
        { ok: false, step: 'supabase_select', status: r.status, body, query: sbUrl.toString() },
        502
      );
    }

    const contentType = r.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const body = await r.text();
      return json(
        { ok: false, step: 'supabase_ct', contentType, body: body.slice(0, 500) },
        502
      );
    }

    const data = await r.json();

    // Si no hay datos, intentar un fallback desde el feed actual
    if (!Array.isArray(data) || data.length === 0) {
      const feedUrl = `${url.origin}/api/feeds/binance`;
      const fr = await fetch(feedUrl, { cache: 'no-store' });
      const fct = fr.headers.get('content-type') || '';
      if (!fr.ok || !fct.includes('application/json')) {
        const body = await fr.text();
        return json(
          {
            ok: false,
            step: 'fallback_feed',
            status: fr.status,
            contentType: fct,
            body: body.slice(0, 500),
          },
          502
        );
      }
      const feed = await fr.json();
      return json({ ok: true, data: [], fallback: feed });
    }

    // Éxito
    return json({ ok: true, data });
  } catch (e) {
    return json({ ok: false, error: String(e.stack || e) }, 500);
  }
});

export const OPTIONS = withCORS(async () => new Response(null, { status: 204 }));