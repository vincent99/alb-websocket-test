#!/usr/bin/env node

const PORT = 8080;

const WS = require('ws').Server;
const http = require('http');
const url = require('url');

const server = http.createServer(httpRequest);

server.listen(PORT, () => {
  console.log(isoDate(), 'Listening on 8080');
});

const ws = new WS({noServer: true});

server.on('upgrade', function upgrade(req, socket, head) {
  const amzHeader = req.headers['x-amzn-trace-id'];
  const parsed = url.parse(req.url, true);
  const fromQuery = parsed.query.id;

  log('WS Upgrade', `amzHeader=${amzHeader}, query=${fromQuery}`);
  ws.handleUpgrade(req, socket, head, function done(ws) {
    ws.headers = req.headers;
    ws.url = req.url;
    wsRequest(ws, req);
  });
});


function httpRequest(req, res) {
  const amzHeader = req.headers['x-amzn-trace-id'];
  const parsed = url.parse(req.url, true);
  const fromQuery = parsed.query.id;

  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    log('HTTP Req  ', `amzHeader=${amzHeader}, query=${fromQuery} body=${body}`);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.write(JSON.stringify({
      amzHeader,
      fromQuery,
      fromBody: body
    }));
  
    res.end();
  });
}

function wsRequest(req) {
  const id = rand();
  const amzHeader = req.headers['x-amzn-trace-id'];
  const parsed = url.parse(req.url, true);
  const fromQuery = parsed.query.id;

  log('WS Open   ', `amzHeader=${amzHeader}, query=${fromQuery}, id=${id}`);

  req.on('message', function(body) {
    log('WS Message', `amzHeader=${amzHeader}, query=${fromQuery} body=${body}, id=${id}`);

    req.send(JSON.stringify({
      amzHeader,
      fromQuery,
      fromBody: body,
      connectionId: id,
    }));
  });

  req.on('close', function(reasonCode, description) {
    log('WS Close  ', `id=${id}, reason=${reasonCode}, description=${description}`);
  });
}

function isoDate() {
  return (new Date()).toISOString();
}

function log(...msg) {
  console.log(isoDate(), ...msg);
}

function rand() {
  return Math.random().toString(36).substring(2);
}
