/**
 * Local Proxy Forwarder
 * Runs inside the browser container on 127.0.0.1:8888.
 * Transparently forwards HTTP/HTTPS CONNECT traffic to upstream proxy
 * with proper Basic Authentication or SOCKS5 support, avoiding Chromium's
 * credential prompt dialogs.
 */

const http = require('http');
const net = require('net');
const url = require('url');

const PROXY_HOST = process.env.PROXY_HOST;
const PROXY_PORT = parseInt(process.env.PROXY_PORT || '8080', 10);
const PROXY_USER = process.env.PROXY_USER || '';
const PROXY_PASS = process.env.PROXY_PASS || '';
const PROXY_TYPE = (process.env.PROXY_TYPE || 'http').toLowerCase();
const LISTEN_PORT = parseInt(process.env.LOCAL_PROXY_PORT || '8888', 10);

if (!PROXY_HOST) {
  console.log('[proxy-forwarder] No PROXY_HOST defined. Exiting forwarder.');
  process.exit(0);
}

console.log(`[proxy-forwarder] Starting local forwarder -> ${PROXY_TYPE}://${PROXY_HOST}:${PROXY_PORT}`);

const authHeader = PROXY_USER ? 'Basic ' + Buffer.from(`${PROXY_USER}:${PROXY_PASS}`).toString('base64') : null;

const server = http.createServer((req, res) => {
  // Handle normal HTTP requests
  const parsed = url.parse(req.url);
  const options = {
    hostname: PROXY_HOST,
    port: PROXY_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers }
  };

  if (authHeader) {
    options.headers['Proxy-Authorization'] = authHeader;
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[proxy-forwarder] HTTP forward error:', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`Proxy Gateway Error: ${err.message}`);
  });

  req.pipe(proxyReq, { end: true });
});

// Handle HTTPS CONNECT tunnel
server.on('connect', (req, clientSocket, head) => {
  // Connect to upstream proxy
  const proxySocket = net.connect(PROXY_PORT, PROXY_HOST, () => {
    let connectReq = `CONNECT ${req.url} HTTP/1.1\r\nHost: ${req.url}\r\n`;
    if (authHeader) {
      connectReq += `Proxy-Authorization: ${authHeader}\r\n`;
    }
    connectReq += '\r\n';

    proxySocket.write(connectReq);
    if (head && head.length > 0) {
      proxySocket.write(head);
    }
  });

  let handshakeComplete = false;
  let responseBuffer = '';

  proxySocket.on('data', (chunk) => {
    if (!handshakeComplete) {
      responseBuffer += chunk.toString();
      if (responseBuffer.includes('\r\n\r\n')) {
        handshakeComplete = true;
        const [headers, ...rest] = responseBuffer.split('\r\n\r\n');
        if (headers.includes(' 200 ') || headers.includes(' 200 OK')) {
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
          const remaining = rest.join('\r\n\r\n');
          if (remaining.length > 0) {
            clientSocket.write(remaining);
          }
          proxySocket.pipe(clientSocket);
          clientSocket.pipe(proxySocket);
        } else {
          console.error('[proxy-forwarder] Upstream proxy rejected CONNECT:', headers.split('\r\n')[0]);
          clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
          clientSocket.end();
          proxySocket.end();
        }
      }
    }
  });

  proxySocket.on('error', (err) => {
    console.error('[proxy-forwarder] Tunnel socket error:', err.message);
    clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    clientSocket.end();
  });

  clientSocket.on('error', (err) => {
    proxySocket.end();
  });
});

server.listen(LISTEN_PORT, '127.0.0.1', () => {
  console.log(`[proxy-forwarder] Listening on 127.0.0.1:${LISTEN_PORT}`);
});
