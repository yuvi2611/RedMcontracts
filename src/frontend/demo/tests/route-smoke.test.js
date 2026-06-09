const http = require('http');

const HOST = '127.0.0.1';
const PORT = 8000;
const ROUTES = [
  'login',
  'reset-password',
  'dashboard',
  'contracts',
  'wizard',
  'preview',
  'employees',
  'templates',
  'approvals',
  'analytics',
  'audit',
  'create-user',
  'settings'
];

function request(path, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: HOST, port: PORT, path }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (redirects >= 5) {
          reject(new Error('Too many redirects for: ' + path));
          return;
        }
        const nextPath = new URL(res.headers.location, `http://${HOST}:${PORT}${path}`).pathname;
        resolve(request(nextPath, redirects + 1));
        return;
      }
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('Request timed out: ' + path));
    });
  });
}

async function run() {
  const shellStatus = await request('/demo-index.html');
  if (shellStatus !== 200) {
    throw new Error('Expected /demo-index.html to return 200, got ' + shellStatus);
  }

  for (const route of ROUTES) {
    const status = await request('/demo-index.html#/' + route);
    if (status !== 200) {
      throw new Error('Route #' + route + ' shell returned ' + status);
    }
  }

  console.log('Route smoke test passed for ' + ROUTES.length + ' routes.');
}

run().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
