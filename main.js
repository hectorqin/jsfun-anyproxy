const net = require('net');
const events = require('events');
const rule = require('./rule');

global.lock();

process.env.HOME = process.env.DATA_DIR;

function portInUse(port, host) {
  return new Promise((resolve, reject) => {
    let server = net.createServer();
    server.on('listening', function () {
      server.close();
      resolve(false);
    });
    server.on('error', function (err) {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      }
    });
    if (!host) {
      server.listen(port);
    } else {
      server.listen(port, host);
    }
  });
}

module.exports = {
  eventHub: new events.EventEmitter(),
  getProxyOption() {
    rule.setScriptEnabled($prefs.get('script'));
    return {
      mode: $prefs.get('mode'),
      vpnMode: $prefs.get('vpnMode'),
      host: $prefs.get('host') || '127.0.0.1',
      port: $prefs.get('port'),
      script: $prefs.get('script'),
      rule: rule,
      socksPort: $prefs.get('socksPort'),
      webInterface: {
        enable: true,
        webPort: $prefs.get('webPort'),
      },
      forceProxyHttps: $prefs.get('forceProxyHttps'),
      dangerouslyIgnoreUnauthorized: $prefs.get(
        'dangerouslyIgnoreUnauthorized'
      ),
      wsIntercept: $prefs.get('wsIntercept'),
      silent: $prefs.get('silent'),
    };
  },
  async getProxyStatus() {
    const options = this.getProxyOption();
    // let isRunning = false;
    // let serverInfo = {};
    // try {
    //   const response = await $http.get(
    //     `http://${options.host}:${options.webInterface.webPort}/api/getInitData`
    //   ).catch((err)=>{
    //     console.log('err  ', err);
    //   });
    //   if (response.data) {
    //     const status = JSON.parse(response.data);
    //     console.log('status  ', status);
    //     serverInfo = status;
    //     if (status.appVersion) {
    //       isRunning = true;
    //     }
    //   }
    // } catch (error) {
    //   isRunning = false;
    // }
    return {
      options,
      status: global.anyproxyServer && global.anyproxyServer.status
          ? global.anyproxyServer.status
          : 'CLOSED',
      proxyServer: global.anyproxyServer,
      HTTPPortInUse: await portInUse(options.port, options.host),
      socksPortInUse: await portInUse(options.socksPort, options.host),
      webPortInUse: await portInUse(options.webPort, options.host),
    };
  },
  getWebAPI() {
    return (
      'http://' +
      ($prefs.get('host') || '127.0.0.1') +
      ':' +
      $prefs.get('webPort')
    );
  },
  // start() {
  //   // 锁定进程，避免被退出
  //   // 获取配置
  //   helper.startProxy();
  //   console.log('Anyproxy start success');
  // },
  // stop() {
  //   // 停止服务
  //   console.log('Anyproxy stop success');
  // },
};
