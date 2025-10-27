// app/api/rates/public/route.js
export const runtime = 'nodejs';

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
  });
}

const ALLOWED = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function withCORS(handler) {
  return async (req) => {
    const origin = req.headers.get('origin') || '';
    const isAllowed = !origin || ALLOWED.length === 0 || ALLOWED.includes(origin);

    if (req.method === 'OPTIONS') {
      const h = new Headers();
      if (isAllowed) h.set('access-control-allow-origin', origin || '*');
      h.set('access-control-allow-headers', 'content-type, authorization');
      h.set('access-control-allow-methods', 'GET, OPTIONS');
      h.set('vary', 'origin');
      return new Response(null, { status: 204, headers: h });
    }

    const res = await handler(req);
    const headers = new Headers(res.headers);
    if (isAllowed) headers.set('access-control-allow-origin', origin || '*');
    headers.set('vary', 'origin');
    return new Response(res.body, { status: res.status, headers });
  };
}

async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const spread = Number(searchParams.get('spread') ?? '8'); // % por defecto
    const bank = searchParams.get('bank') || undefined;
    const amountVES = searchParams.get('amountVES')
      ? Number(searchParams.get('amountVES'))
      : undefined;

    // 1) Intenta tu vista agregada
    const q = new URL(`${process.env.SUPABASE_REST_URL}/v_latest_rate`);
    if (bank) q.searchParams.set('bank', `eq.${bank}`);
    if (amountVES) {
      const b =
        amountVES < 200000
          ? '<200k'
          : amountVES < 1_000_000
          ? '200k–1M'
          : amountVES < 5_000_000
          ? '1M–5M'
          : '≥5M';
      q.searchParams.set('amount_bucket', `eq.${encodeURIComponent(b)}`);
    }
    q.searchParams.set('limit', '1');
    q.searchParams.set('order', 'ts.desc');
    q.searchParams.set('select', 'eff_buy,eff_sell,ts');

    const r1 = await fetch(q, {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE,
        authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`,
        accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!r1.ok) {
      const body = await r1.text();
      // sigue al fallback, pero adjunta razón en debug
      // console.warn('supabase latest_rate', r1.status, body);
    } else {
      const arr = await r1.json();
      if (Array.isArray(arr) && arr.length) {
        const { eff_buy, eff_sell, ts } = arr[0];
        if (eff_buy && eff_sell) {
          const s = Number(((eff_sell - eff_buy) / ((eff_buy + eff_sell) / 2)) * 100);
          return json({
            source: 'agg',
            executable: {
              buy: Math.round(eff_buy * (1 - spread / 100)),
              sell: Math.round(eff_sell * (1 + spread / 100)),
              spread_pct: spread,
            },
            raw: { eff_buy, eff_sell, spread_calc_pct: s, ts },
          });
        }
      }
    }

    // 2) Fallback: llama a tu feed de Binance interno
    const r2 = await fetch(new URL(req.url).origin + '/api/feeds/binance', {
      cache: 'no-store',
    });
    const ct = r2.headers.get('content-type') || '';
    if (!r2.ok) {
      const body = await r2.text();
      return json({ error: 'feed_binance_failed', status: r2.status, body }, 502);
    }
    if (!ct.includes('application/json')) {
      const body = await r2.text();
      return json({ error: 'feed_binance_not_json', contentType: ct, body }, 502);
    }
    const feed = await r2.json();
    if (!feed || !feed.eff_buy || !feed.eff_sell) {
      return json({ error: 'feed_binance_empty', feed }, 502);
    }
    return json({
      source: 'binance',
      executable: {
        buy: Math.round(feed.eff_buy * (1 - spread / 100)),
        sell: Math.round(feed.eff_sell * (1 + spread / 100)),
        spread_pct: spread,
      },
      raw: feed,
    });
  } catch (err) {
    return json({ error: 'internal', message: String(err.stack || err) }, 500);
  }
}

export const GET = withCORS(handler);
export const OPTIONS = withCORS(handler);