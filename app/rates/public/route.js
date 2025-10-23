export const runtime = 'nodejs';

export async function GET() {
  return new Response(JSON.stringify({ ok: true, msg: 'API vivo' }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}
