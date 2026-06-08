const http = require('http');

const HOST = '127.0.0.1';
const PORT = 8000;
const ROUTES = [
  'login',
  'dashboard',
  'contracts',
  'wizard',
  'preview',
  'employees',
  'templates',
  'approvals',
  'analytics',
  'audit',
  'settings'
];

function request(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: HOST, port: PORT, path }, res => {
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
