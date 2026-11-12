// ShopSphere Deploy Control Panel
// A tiny web server (no npm packages needed, Node 18+) that runs next to Jenkins.
// The "Deploy Now" button calls this server, which triggers the Jenkins job using an API token
// kept here on the server (never sent to the browser), then reports each pipeline stage live.

const http = require('http');
const fs = require('fs');
const path = require('path');

const cfg = {
  port: parseInt(process.env.PORT || '5000', 10),
  jenkinsUrl: (process.env.JENKINS_URL || 'http://localhost:8080').replace(/\/$/, ''),
  jenkinsUser: process.env.JENKINS_USER || '',
  jenkinsToken: process.env.JENKINS_API_TOKEN || '',
  job: process.env.JOB_NAME || 'shopsphere',
  appHealthUrl: process.env.APP_HEALTH_URL || 'http://localhost/api/health',
  appPublicUrl: process.env.APP_PUBLIC_URL || '',         // e.g. http://13.233.10.20 (auto-detected if empty)
  jenkinsPublicUrl: process.env.JENKINS_PUBLIC_URL || '', // e.g. http://13.233.10.20:8080 (auto-detected if empty)
};

if (!cfg.jenkinsUser || !cfg.jenkinsToken) {
  console.warn('[panel] JENKINS_USER / JENKINS_API_TOKEN not set: the Deploy button will not work yet.');
}

const authHeader = () => ({
  Authorization: 'Basic ' + Buffer.from(`${cfg.jenkinsUser}:${cfg.jenkinsToken}`).toString('base64'),
});
const jobUrl = () => `${cfg.jenkinsUrl}/job/${encodeURIComponent(cfg.job)}`;

async function jenkins(pathname, { method = 'GET' } = {}) {
  const res = await fetch(`${cfg.jenkinsUrl}${pathname}`, {
    method, headers: authHeader(), redirect: 'manual', signal: AbortSignal.timeout(8000),
  });
  return res;
}

async function jenkinsJson(pathname) {
  const res = await jenkins(pathname);
  if (!res.ok) throw Object.assign(new Error(`Jenkins answered ${res.status} for ${pathname}`), { status: res.status });
  return res.json();
}

// Start a build. Returns the queue item id Jenkins gives back in the Location header.
async function trigger(action) {
  const base = `/job/${encodeURIComponent(cfg.job)}`;
  let res = await jenkins(`${base}/buildWithParameters?ACTION=${action}`, { method: 'POST' });
  // Before the very first run Jenkins does not know the job has parameters yet: fall back to a plain build.
  if (!res.ok && res.status !== 201 && action === 'deploy') {
    res = await jenkins(`${base}/build`, { method: 'POST' });
  }
  if (res.status !== 201 && !res.ok) {
    const hint = res.status === 401 || res.status === 403 ? ' (check JENKINS_USER and JENKINS_API_TOKEN)' :
      res.status === 404 ? ` (no Jenkins job named "${cfg.job}")` : '';
    throw Object.assign(new Error(`Jenkins refused the request: HTTP ${res.status}${hint}`), { status: 502 });
  }
  const m = /\/queue\/item\/(\d+)/.exec(res.headers.get('location') || '');
  return { queueId: m ? m[1] : null };
}

async function buildInfo(number) {
  const [info, wf] = await Promise.all([
    jenkinsJson(`/job/${encodeURIComponent(cfg.job)}/${number}/api/json?tree=number,building,result,description,timestamp,duration,actions[parameters[name,value]]`),
    jenkinsJson(`/job/${encodeURIComponent(cfg.job)}/${number}/wfapi/describe`).catch(() => ({ stages: [] })),
  ]);
  const params = (info.actions || []).flatMap((a) => a.parameters || []);
  const action = (params.find((p) => p.name === 'ACTION') || {}).value || 'deploy';
  return {
    number: info.number,
    building: info.building,
    result: info.result, // SUCCESS | FAILURE | ABORTED | null while running
    description: info.description,
    startedAt: info.timestamp,
    durationMillis: info.building ? Date.now() - info.timestamp : info.duration,
    action,
    stages: (wf.stages || []).map((s) => ({ name: s.name, status: s.status, durationMillis: s.durationMillis })),
    consoleUrl: `/job/${encodeURIComponent(cfg.job)}/${info.number}/console`,
  };
}

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

const routes = {
  'GET /api/config': async () => ({
    job: cfg.job, appPublicUrl: cfg.appPublicUrl, jenkinsPublicUrl: cfg.jenkinsPublicUrl,
    configured: Boolean(cfg.jenkinsUser && cfg.jenkinsToken),
  }),
  'POST /api/deploy': async () => trigger('deploy'),
  'POST /api/rollback': async () => trigger('rollback'),
  'GET /api/last': async () => {
    const j = await jenkinsJson(`/job/${encodeURIComponent(cfg.job)}/api/json?tree=lastBuild[number],inQueue`);
    if (!j.lastBuild) return { build: null, inQueue: j.inQueue };
    return { build: await buildInfo(j.lastBuild.number), inQueue: j.inQueue };
  },
  'GET /api/app': async () => {
    try {
      const r = await fetch(cfg.appHealthUrl, { signal: AbortSignal.timeout(3000) });
      const body = await r.json().catch(() => ({}));
      return { up: r.ok, ...body };
    } catch {
      return { up: false };
    }
  },
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    // Static page
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return fs.createReadStream(path.join(__dirname, 'public', 'index.html')).pipe(res);
    }
    // Queue item -> build number once Jenkins starts the build
    let m = /^\/api\/queue\/(\d+)$/.exec(url.pathname);
    if (req.method === 'GET' && m) {
      const q = await jenkinsJson(`/queue/item/${m[1]}/api/json`).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!q) return send(res, 200, { state: 'unknown' });
      if (q.cancelled) return send(res, 200, { state: 'cancelled' });
      if (q.executable) return send(res, 200, { state: 'started', build: q.executable.number });
      return send(res, 200, { state: 'queued', why: q.why || 'Waiting for Jenkins…' });
    }
    m = /^\/api\/build\/(\d+)$/.exec(url.pathname);
    if (req.method === 'GET' && m) return send(res, 200, await buildInfo(m[1]));

    const handler = routes[`${req.method} ${url.pathname}`];
    if (handler) return send(res, 200, await handler());
    return send(res, 404, { error: 'Not found' });
  } catch (err) {
    const unreachable = err.name === 'TimeoutError' || err.cause?.code === 'ECONNREFUSED';
    console.error('[panel]', err.message);
    return send(res, 502, { error: unreachable ? 'Cannot reach Jenkins. Is it running?' : err.message });
  }
});

server.listen(cfg.port, '0.0.0.0', () => {
  console.log(`[panel] Control panel on http://0.0.0.0:${cfg.port}  (Jenkins: ${jobUrl()})`);
});
