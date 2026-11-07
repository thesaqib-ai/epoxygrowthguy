/**
 * Calls the site's health check once a day, which queries Supabase and stops
 * the free project pausing from inactivity. Pages has no scheduler, and a
 * GitHub Actions schedule switches itself off after 60 days without a commit,
 * so this lives in its own Worker. It holds no secrets.
 *
 * Deploy from this folder with: npx wrangler deploy
 */
const HEALTH_URL = 'https://epoxygrowthguy.com/api/health';

export default {
  async scheduled() {
    const res = await fetch(HEALTH_URL, { cache: 'no-store' });
    // Throwing marks the run as failed in the Worker's Cron Events.
    if (!res.ok) throw new Error(`Health check returned ${res.status}`);
    console.log('Health check ok');
  },
};
