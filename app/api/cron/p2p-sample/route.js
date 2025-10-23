// app/api/cron/p2p-sample/route.js
import { NextResponse } from 'next/server';

const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

function sbHeaders(json=true){
  const h = { apikey: SB_SERVICE_ROLE, Authorization:`Bearer ${SB_SERVICE_ROLE}` };
  if (json) h['Content-Type']='application/json';
  return h;
}

export const runtime = 'nodejs';

export async function GET() {
  try {
    // 1) Lee feed actual
    const r = await fetch(`${process.env.NEXT_PUBLIC_SITE_ORIGIN ?? ''}/api/feeds/binance`, { cache:'no-store' });
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();

    // 2) Aplica spread admin (opcional, aquí solo guardamos el crudo)
    const row = {
      scope: 'public',
      eff_buy:  j.eff_buy,
      eff_sell: j.eff_sell,
      spread:   j.spread,
      n:        Math.min(j.n_buy, j.n_sell)
    };

    // 3) Inserta en p2p_monitor_samples
    const ins = await fetch(`${SB_URL}/rest/v1/p2p_monitor_samples?select=*`, {
      method:'POST', headers:{ ...sbHeaders(), Prefer:'return=representation' },
      body: JSON.stringify(row)
    });
    if (!ins.ok) throw new Error(await ins.text());
    const [saved] = await ins.json();

    return NextResponse.json({ ok:true, saved }, { headers:{'Cache-Control':'no-store'} });
  } catch (e) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 500 });
  }
}
