// app/api/rates/public/route.js (solo la parte de GET)
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const SITE = process.env.SITE_URL || 'https://usdt-ves.vercel.app';

    // Spread
    let spread = Number(url.searchParams.get('spread') ?? NaN);
    if (!Number.isFinite(spread)) {
      try {
        const r = await fetch(`${SB_URL}/rest/v1/rates_config?id=eq.true&select=spread`, { headers: sbHeaders() });
        if (r.ok) { const [row] = await r.json(); if (row?.spread != null) spread = Number(row.spread); }
      } catch {}
    }
    if (!Number.isFinite(spread)) spread = 8;

    // Filtros
    const bank = (url.searchParams.get('bank') || '').toLowerCase();
    const amountVES = Number(url.searchParams.get('amountVES') || '0') || 0;

    // Último punto (90 min) con filtros
    const since = new Date(Date.now() - 90*60*1000).toISOString();
    const q = new URL(`${SB_URL}/rest/v1/v_p2p_monitor_1m`);
    q.searchParams.set('select','t_min,eff_buy,eff_sell,spread,n,bank,amount_bucket');
    q.searchParams.set('scope','eq.public');
    q.searchParams.set('t_min',`gte.${since}`);
    q.searchParams.set('order','t_min.desc');
    q.searchParams.set('limit','1');
    if (bank) q.searchParams.set('bank', `eq.${bank}`);
    if (amountVES) {
      const b = amountVES < 200000 ? '<200k' : amountVES < 1e6 ? '200k–1M' : amountVES < 5e6 ? '1M–5M' : '≥5M';
      q.searchParams.set('amount_bucket', `eq.${encodeURIComponent(b)}`);
    } else {
      q.searchParams.set('amount_bucket', 'eq.*');
    }

    let baseBuy, baseSell, ts, source='supabase';
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

    // Fallback a tu propio feed con los mismos filtros
    if (!(Number.isFinite(baseBuy) && Number.isFinite(baseSell))) {
      const uf = new URL(`${SITE}/api/feeds/binance`);
      if (bank) uf.searchParams.set('bank', bank);
      if (amountVES) uf.searchParams.set('amountVES', String(amountVES));

      const r = await fetch(uf.toString(), { cache:'no-store' });
      const j = await r.json();
      if (!r.ok || !Number.isFinite(j?.eff_buy) || !Number.isFinite(j?.eff_sell)) {
        return withCORS(req, NextResponse.json({ error: 'Sin datos en Binance' }, { status: 502 }));
      }
      baseBuy  = Number(j.eff_buy);
      baseSell = Number(j.eff_sell);
      ts = j.ts || new Date().toISOString();
      source = 'binance_fallback';

      // Inserta para que quede histórico en la vista
      try {
        await fetch(`${SB_URL}/rest/v1/p2p_monitor_samples?select=*`, {
          method:'POST',
          headers:{ ...sbHeaders(true), Prefer:'return=representation' },
          body: JSON.stringify({
            scope:'public',
            eff_buy: baseBuy,
            eff_sell: baseSell,
            spread: baseSell - baseBuy,
            n: Math.min(j.n_buy||0, j.n_sell||0),
            bank: bank || null,
            amount_ves: amountVES || null
          })
        });
      } catch {}
    }

    const k = 1 + (Number(spread)/100);
    return withCORS(req, NextResponse.json({
      ts,
      spread_pct: Number(spread),
      base: { buy: baseBuy, sell: baseSell },
      executable: { buy: baseBuy / k, sell: baseSell * k },
      source, bank: bank || '*', amountVES: amountVES || null
    }, { headers:{ 'Cache-Control':'no-store' }}));
  } catch (e) {
    return withCORS(req, NextResponse.json({ error: String(e?.message || e) }, { status: 500 }));
  }
}
