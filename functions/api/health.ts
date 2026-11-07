/**
 * GET /api/health
 *
 * Touches the database and says whether it answered. Called daily by the
 * Worker in workers/keepalive so the free Supabase project never pauses from
 * inactivity. Returns no data, and the reason for a failure only goes to the
 * logs.
 */
import { pingStore, type StoreEnv } from '../../src/lib/store';

export const onRequestGet: PagesFunction<StoreEnv> = async ({ env }) => {
  let ok = true;
  try {
    await pingStore(env);
  } catch (error) {
    console.error('Health check failed', error);
    ok = false;
  }

  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 503,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
