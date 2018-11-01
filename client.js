#!/usr/bin/env node

const BASE = 'http://vjf-alb-websocket-test-1896720172.us-east-1.elb.amazonaws.com';
const WS_BASE = BASE.replace(/^http/,'ws');
const LOOP_SLEEP_MIN = 500;
const LOOP_SLEEP_MAX = 30000;
const WS_FRACTION = 0.2;
const PATH_FRACTION = 0.5;
const QUERY_FRACTION = 0.5;
const POST_FRACTION = 0.5;
const WS_MSG_MIN = 1;
const WS_MSG_MAX = 100;
const WS_SLEEP_MIN = 1;
const WS_SLEEP_MAX = 10000;

const WebSocket = require('ws');
const request = require('request');

loop();

function loop() {
  if ( Math.random() < WS_FRACTION ) {
    wsTest();
  } else {
    httpTest();
  }

  setTimeout(loop, between(LOOP_SLEEP_MIN, LOOP_SLEEP_MAX));
}

function wsTest() {
  let url = WS_BASE;

  let clientId = randStr();
  let serverId = null;
  let path = null;
  let body = randStr();
  let query = null;

  if ( Math.random() < PATH_FRACTION ) {
    path = randStr();
    url += '/' +  path;
  }

  if ( Math.random() < QUERY_FRACTION ) {
    query = randStr();
    url += '?id=' + query;
  }

  let left = between(WS_MSG_MIN, WS_MSG_MAX);

  const ws = new WebSocket(url);

  ws.on('open', function() {
    ws.send(body);
  });

  ws.on('message', function(data) {
    let json;
    try {
      json = JSON.parse(data);
    } catch (e) {
      error('JSON ERROR', e);
    }

    let pathOk = true;
    if ( path && json.path.substr(1) !== path ) {
      pathOk = false;
    }

    let queryOk = true;
    if ( query && json.fromQuery !== query ) {
      queryOk = false;
    }

    let bodyOk = true;
    if ( body && json.fromBody !== body ) {
      bodyOk = false;
    }

    let serverOk = true;
    if ( serverId ) {
      if ( json.serverId !== serverId ) {
        serverOk = false;
      }
    } else {
      serverId = json.serverId;
    }

    if ( pathOk && queryOk && bodyOk && serverOk ) {
      log(  `WS OK         client=${clientId}, server=${serverId}, path=${path}, query=${query}, body=${body}, left=${left}, amz=${json.amzHeader}`);
    } else {
      error(`WS MISMATCH   client=${clientId}, server=${serverId}, path=${path}, query=${query}, body=${body}, left=${left}, res=${json}`);
    }

    left--;
    if ( left > 0 ) {
      body = randStr();

      setTimeout(function() {
        ws.send(body);
      }, between(WS_SLEEP_MIN, WS_SLEEP_MAX));

    } else {
      ws.close();
    }
  });

  ws.on('close', function() {
    if ( left > 0 ) {
      error(`WS CLOSED     path=${path}, query=${query}, left=${left}`);
    }
  });
}

function httpTest() {
  let url = BASE;

  let path = null;
  let body = null;
  let query = null;

  if ( Math.random() < PATH_FRACTION ) {
    path = randStr();
    url += '/' +  path;
  }

  if ( Math.random() < QUERY_FRACTION ) {
    query = randStr();
    url += '?id=' + query;
  }

  if ( Math.random() < POST_FRACTION ) {
    body = randStr();

    request({
      url,
      body,
      method: 'post',
      headers: {
        'content-type': 'text/plain',
      },
    }, done);
  } else {
    request({url}, done);
  }

  function done(err, res, data) {
    if ( err ) {
      error(err, data);
      return;
    }

    let json;
    try {
      json = JSON.parse(data);
    } catch (e) {
      error(e);
    }

    let pathOk = true;
    if ( path && json.path.substr(1) !== path ) {
      pathOk = false;
    }

    let queryOk = true;
    if ( query && json.fromQuery !== query ) {
      queryOk = false;
    }

    let bodyOk = true;
    if ( body && json.fromBody !== body ) {
      bodyOk = false;
    }

    if ( pathOk && queryOk && bodyOk ) {
      log(  `HTTP OK       path=${path}, query=${query}, body=${body}, amz=${json.amzHeader}`);
    } else {
      error(`HTTP MISMATCH path=${path}, query=${query}, body=${body}, res=${json}`);
    }
  }
}

function isoDate() {
  return (new Date()).toISOString();
}

function log(...msg) {
  console.log(isoDate(), ...msg);
}

function error(...msg) {
  console.error(isoDate(), ...msg);
}

function randStr() {
  return Math.random().toString(36).substring(2).toUpperCase();
}

function between(min,max) {
  return  Math.floor(Math.random()*(max-min+1))+min;
}
