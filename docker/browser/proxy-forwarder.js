/**
 * Local Proxy Forwarder (v1.2)
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
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    res.end(`Proxy Gateway Error: ${err.message}`);
  });

  req.pipe(proxyReq, { end: true });
});

// Handle HTTPS CONNECT tunnel with binary-safe buffering
server.on('connect', (req, clientSocket, head) => {
  const proxySocket = net.connect(PROXY_PORT, PROXY_HOST, () => {
    let connectReq = `CONNECT ${req.url} HTTP/1.1\r\nHost: ${req.url}\r\n`;
    if (authHeader) {
      connectReq += `Proxy-Authorization: ${authHeader}\r\n`;
    }
    connectReq += '\r\n';

    // Do NOT write head here; head is TLS data that must only be sent after upstream sends 200 OK
    proxySocket.write(connectReq);
  });

  let handshakeComplete = false;
  let buffer = Buffer.alloc(0);

  proxySocket.on('data', (chunk) => {
    if (!handshakeComplete) {
      buffer = Buffer.concat([buffer, chunk]);
      const idx = buffer.indexOf('\r\n\r\n');
      if (idx !== -1) {
        handshakeComplete = true;
        const headerStr = buffer.subarray(0, idx).toString('latin1');
        const remaining = buffer.subarray(idx + 4);

        if (headerStr.includes(' 200 ') || headerStr.includes(' 200 OK')) {
          if (clientSocket.writable) {
            clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
          }
          if (remaining.length > 0 && clientSocket.writable) {
            clientSocket.write(remaining);
          }
          if (head && head.length > 0 && proxySocket.writable) {
            proxySocket.write(head);
          }
          proxySocket.pipe(clientSocket);
          clientSocket.pipe(proxySocket);
        } else {
          console.error('[proxy-forwarder] Upstream proxy rejected CONNECT:', headerStr.split('\r\n')[0]);
          if (clientSocket.writable) {
            clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
          }
          clientSocket.destroy();
          proxySocket.destroy();
        }
      }
    }
  });

  proxySocket.on('error', (err) => {
    console.error('[proxy-forwarder] Tunnel socket error:', err.message);
    if (clientSocket.writable) {
      clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    }
    clientSocket.destroy();
    proxySocket.destroy();
  });

  clientSocket.on('error', () => {
    proxySocket.destroy();
  });

  clientSocket.on('end', () => {
    proxySocket.end();
  });

  proxySocket.on('end', () => {
    clientSocket.end();
  });
});

server.listen(LISTEN_PORT, '127.0.0.1', () => {
  console.log(`[proxy-forwarder] Listening on 127.0.0.1:${LISTEN_PORT}`);
});
