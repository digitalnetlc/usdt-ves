export const SB_URL = process.env.SUPABASE_URL;
export const SB_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

export function sbHeaders(json = true) {
  const h = {
    apikey: SB_SERVICE_ROLE,
    Authorization: `Bearer ${SB_SERVICE_ROLE}`,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}
