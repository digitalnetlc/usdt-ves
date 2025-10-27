// app/api/feeds/binance/route.js
export const runtime = 'nodejs';
function json(d,s=200){ return new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}}); }

const ENDPOINT = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

async function fetchSide(side) {
  const payload = {
    page: 1,
    rows: 20,
    asset: 'USDT',
    tradeType: side, // 'BUY' or 'SELL'
    fiat: 'VES',
    publisherType: null,
    payTypes: [], // no filtres por banco para no vaciar
  };
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  if (!r.ok) return { ok:false, status:r.status, body: await r.text() };
  const j = await r.json().catch(async _ => ({ parseError:true, body: await r.text() }));
  return { ok:true, json:j };
}

export async function GET(req) {
  try {
    const [buy, sell] = await Promise.all([fetchSide('BUY'), fetchSide('SELL')]);
    if (!buy.ok) return json({ error:'binance_buy_failed', ...buy }, 502);
    if (!sell.ok) return json({ error:'binance_sell_failed', ...sell }, 502);

    const parse = (arr) => {
      const advs = arr?.json?.data || [];
      const prices = advs
        .map(a => Number(a?.adv?.price))
        .filter(n => Number.isFinite(n));
      prices.sort((a,b)=>a-b);
      return { n: prices.length, p25: prices[Math.floor(prices.length*0.25)] ?? null, p75: prices[Math.floor(prices.length*0.75)] ?? null, avg: prices.length ? prices.reduce((s,x)=>s+x,0)/prices.length : null };
    };

    const b = parse(buy);
    const s = parse(sell);
    const eff_buy = b.p75 ?? b.avg;
    const eff_sell = s.p25 ?? s.avg;
    const spread = (eff_buy && eff_sell) ? ((eff_sell - eff_buy) / ((eff_buy + eff_sell)/2)) * 100 : null;

    return json({
      params: { bank: null, amountVES: null, side: 'both' },
      n_buy: b.n, n_sell: s.n,
      eff_sell: eff_sell ?? null,
      eff_buy: eff_buy ?? null,
      spread: spread ?? null,
      p25_sell: s.p25, p75_sell: s.p75,
      p25_buy: b.p25, p75_buy: b.p75,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return json({ error:'internal', message:String(e.stack||e) }, 500);
  }
}