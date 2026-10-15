/**
 * Throwaway stub that stands in for Supabase and n8n while testing the
 * Pages Function locally. Not used in production.
 *
 *   node scripts/stub-server.mjs
 */
import { createServer } from 'node:http';

createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    console.log(`\n--- ${req.method} ${req.url}`);
    console.log('headers:', {
      apikey: req.headers.apikey ? '(present)' : undefined,
      authorization: req.headers.authorization ? '(present)' : undefined,
      prefer: req.headers.prefer,
      'x-webhook-secret': req.headers['x-webhook-secret'],
    });
    console.log('body:', body);

    if (req.url.startsWith('/rest/v1/interview_requests')) {
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify([{ id: '11111111-2222-3333-4444-555555555555' }]));
      return;
    }

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"received":true}');
  });
}).listen(8900, '127.0.0.1', () => {
  console.log('Stub listening on http://127.0.0.1:8900');
});
