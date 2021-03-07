const socks = require('sockx');
const http = require('http');
const AnyProxy = require('anyproxy');
const dgram = require('dgram');
const net = require('net');
const ip = require('ip');

const defaultOptions = {
  host: '0.0.0.0', // HTTP/socks5代理Host
  socksPort: 8000, // socks5代理端口
  port: 8001, // HTTP代理端口
  // rule: require('myRuleModule'), // 自定义规则模块
  webInterface: {
    enable: true, // 是否启用web版界面，默认false
    webPort: 8002, // web版界面端口号，默认8002
  },
  // throttle: 10000, // 限速值，单位kb/s，默认不限速
  forceProxyHttps: false, // 是否强制拦截所有的https，忽略规则模块的返回，默认false
  dangerouslyIgnoreUnauthorized: true, // 是否忽略请求中的证书错误，默认false
  // wsIntercept: false, // 是否开启websocket代理，默认false
  // silent: false, // 是否屏蔽所有console输出，默认false
};

const ATYP_V4 = 0x01;
const ATYP_DOMAIN = 0x03;
const ATYP_V6 = 0x04;

const BYTE_ORDER_BE = 0;
const BYTE_ORDER_LE = 1;

/**
 * convert an unsigned number to a buffer,
 * with specified length in specified byte order.
 * @param num
 * @param len
 * @param byteOrder
 * @returns {Buffer}
 */
function numberToBuffer(num, len = 2, byteOrder = BYTE_ORDER_BE) {
  if (len < 1) {
    throw Error('len must be greater than 0');
  }
  const buf = Buffer.alloc(len);
  if (byteOrder === BYTE_ORDER_BE) {
    buf.writeUIntBE(num, 0, len);
  } else {
    buf.writeUIntLE(num, 0, len);
  }
  return buf;
}

function getHostType(host) {
  if (net.isIPv4(host)) {
    return ATYP_V4;
  }
  if (net.isIPv6(host)) {
    return ATYP_V6;
  }
  return ATYP_DOMAIN;
}

function parseSocks5UdpRequest (buffer) {
  if (buffer.length < 10) {
    return null;
  }
  if (buffer[0] !== 0x00 || buffer[1] !== 0x00) {
    return null;
  }
  const frag = buffer[2];
  if (frag !== 0x00) {
    return null; // doesn't support fragment
  }
  let addr = null;
  let pos = 4;
  switch (buffer[3]) {
    case ATYP_V4:
      addr = ip.toString(buffer.slice(4, 8));
      pos = pos + 4;
      break;
    case ATYP_DOMAIN:
      addr = buffer.slice(5, 5 + buffer[4]).toString();
      pos = pos + 1 + buffer[4];
      break;
    case ATYP_V6:
      addr = ip.toString(buffer.slice(4, 20));
      pos = pos + 16;
      break;
    default:
      break;
  }
  const port = buffer.slice(pos, pos + 2).readUInt16BE(0);
  const data = buffer.slice(pos + 2);
  return {
    host: addr,
    port: port,
    data: data
  };
}
module.exports.parseSocks5UdpRequest = parseSocks5UdpRequest;

function encodeSocks5UdpResponse({
  host,
  port,
  data
}) {
  const atyp = getHostType(host);
  const _host = atyp === ATYP_DOMAIN ? Buffer.from(host) : ip.toBuffer(host);
  const _port = numberToBuffer(port);
  return Buffer.from([
    0x00, 0x00, 0x00, atyp,
    ...(atyp === ATYP_DOMAIN ? [_host.length] : []),
    ..._host, ..._port, ...data
  ]);
}

async function createUdpServer(options) {
  options = Object.assign({}, defaultOptions, options || {});
  return new Promise((resolve, reject) => {
    const serverUDP = dgram.createSocket('udp4');

    serverUDP.on('message', (msg, rinfo) => {
      // console.info(`UDP[INFO] - received msg `, rinfo, msg);
      const parsed = parseSocks5UdpRequest(msg);
      if (parsed === null) {
        console.info(`UDP[ERROR] - [${rinfo.address}:${rinfo.port}] drop invalid udp packet: ${dumpHex(msg)}`);
        return;
      }
      const {
        host,
        port,
        data
      } = parsed;
      // console.info(`UDP[INFO] - parsed `, parsed);

      let client = dgram.createSocket('udp4');
      client.on('error', (err) => {
        console.info(`UDP[ERROR] - ${err}`);
        client.close();
        client = null;
      });
      client.on('message', (fbMsg, fbRinfo) => {
        // console.info(`UDP client[INFO] - received `, fbRinfo, fbMsg);
        // console.info(`UDP client[INFO] - received `, fbRinfo, fbMsg);
        serverUDP.send(fbMsg, rinfo.port, rinfo.address, (err) => {
          if (err) console.error(`UDP[ERROR] - ${err}`);
        });
        client.close();
        client = null;
      });
      // console.info(`UDP client[INFO] - send to ${host}:${port}`);
      client.send(data, port, host, (err) => {
        if (err) {
          console.info(`UDP[ERROR] - ${err}`);
          client.close();
          client = null;
        }
      });
      setTimeout(() => {
        if (client) {
          client.close();
        }
      }, 3000);
    });

    serverUDP.on('error', reject);

    // monkey patch for Socket.send() to meet Socks5 protocol
    serverUDP.send = ((send) => (data, port, host, ...args) => {
      let packet = encodeSocks5UdpResponse({
        host,
        port,
        data
      });
      send.call(serverUDP, packet, port, host, ...args);
    })(serverUDP.send);

    serverUDP.bind({
      address: options.host,
      port: options.socksPort
    }, () => {
      const service = `udp://${options.host}:${options.socksPort}`;
      console.info(`udp relay server is running at ${service}`);
      resolve(serverUDP);
    });

    global.udpServer = serverUDP;
  });
}
module.exports.createUdpServer = createUdpServer;

module.exports.startSocksProxy = function (options) {
  options = Object.assign({}, defaultOptions, options || {});
  return Promise.all([
    createUdpServer(options),
    new Promise(function (resolve, reject) {
      if (!global.anyproxyServer) {
        reject('请先启动Anyproxy');
        return;
      }
      // socks5代理
      const socksServer = socks.createServer(function (info, accept, deny) {
        if (info.dstPort === 53) {
          accept();
          return;
        }
        var dstPort = info.dstPort;
        var dstAddr = info.dstAddr;
        var connPath = dstAddr + ':' + dstPort;
        var headers = {
          host: connPath
        };
        headers['x-anyproxy-server'] = 'socks';
        var client = http.request({
          method: 'CONNECT',
          agent: false,
          path: connPath,
          host: '127.0.0.1',
          port: options.port,
          headers: headers,
        });
        var destroy = function () {
          if (client) {
            client.abort();
            client = null;
            deny();
          }
        };
        client.on('error', destroy);
        client.on('connect', function (res, socket) {
          socket.on('error', destroy);
          if (res.statusCode !== 200) {
            return destroy();
          }
          var reqSock = accept(true);
          if (reqSock) {
            reqSock.pipe(socket).pipe(reqSock);
          } else {
            destroy();
          }
        });
        client.end();
      });

      socksServer.on('error', reject);

      socksServer.listen(options.socksPort, options.host, function () {
        console.log(
          'SOCKS5 server listening at ' + options.host + ':' + options.socksPort
        );
        resolve(socksServer);
      });
      socksServer.useAuth(socks.auth.None());

      global.anyproxyServer.socksServer = socksServer;
    })
  ]);
};

module.exports.stopSocksProxy = function () {
  if (global.udpServer) {
    global.udpServer.close();
    global.udpServer = null;
  }
  if (global.anyproxyServer && global.anyproxyServer.socksServer) {
    global.anyproxyServer.socksServer.close();
    global.anyproxyServer.socksServer = null;
  }
};

module.exports.startHTTPProxy = function (options) {
  options = Object.assign({}, defaultOptions, options || {});
  return new Promise(function (resolve, reject) {
    // anyproxy 代理
    const proxyServer = new AnyProxy.ProxyServer(options);

    proxyServer.on('ready', () => {
      /* */
      resolve();
    });
    proxyServer.on('error', (e) => {
      /* */
      reject(e);
    });
    proxyServer.start();

    global.anyproxyServer = proxyServer;
  });
};

module.exports.stopHTTPProxy = function () {
  if (global.anyproxyServer) {
    global.anyproxyServer.close();
    global.anyproxyServer = null;
  }
};

module.exports.setVPN2Socks = async function (host, port) {
  await $vpn.startTunnel('Anyproxy', {
    name: 'Anyproxy',
    type: 1, // 0 shadowsocks, 1 socks5
    host: host,
    port: port,
    udpRelay: true,
    dnsServer: '114.114.114.114',
    applicationMode: 1,
    applications: [
      'com.android.browser'
    ],
  })
}

module.exports.stopTunnel = async function () {
  await $vpn.stopTunnel('Anyproxy');
}