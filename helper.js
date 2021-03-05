const socks = require('sockx');
const http = require('http');
const AnyProxy = require('anyproxy');

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

module.exports.startSocksProxy = function (options) {
  options = Object.assign({}, defaultOptions, options || {});
  return new Promise(function (resolve, reject) {
    if (!global.anyproxyServer) {
      reject('请先启动Anyproxy');
      return;
    }
    // socks5代理
    const socksServer = socks.createServer(function (info, accept, deny) {
      console.log("socksServer info ", info);
      var dstPort = info.dstPort;
      var dstAddr = info.dstAddr;
      var connPath = dstAddr + ':' + dstPort;
      var headers = {host: connPath};
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

    socksServer.listen(options.socksPort, options.host, function () {
      console.log(
        'SOCKS server listening at ' + options.host + ':' + options.socksPort
      );
      resolve();
    });
    socksServer.useAuth(socks.auth.None());

    global.anyproxyServer.socksServer = socksServer;
  });
};

module.exports.stopSocksProxy = function () {
  if (global.anyproxyServer && global.anyproxyServer.socksServer) {
    global.anyproxyServer.socksServer.close();
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
  }
};

module.exports.setVPN2Socks = async function(host, port) {
  await $vpn.startTunnel('Anyproxy', {
    name: 'Anyproxy',
    type: 1, // 0 shadowsocks, 1 socks5
    host: host,
    port: port
  })
}