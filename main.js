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
      tunnelType: $prefs.get('tunnelType'),
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
  async showAgreement() {
    if (!$storage.get('agreement')) {
      const result = await $input.prompt({
        title: '隐私和免责协议',
        content: `隐私说明
        JSFun-Anyproxy(以下简称Anyproxy)是安卓应用JSFun一个网络代理插件，在使用过程中将会记录下您的一些网络浏览记录，您可以使用这些记录查看最近的网络请求。Anyproxy绝对不会将您的任何信息，包括但不限于浏览记录、服务器信息上传到任何服务器。
        免责声明
        1、Anyproxy只提供基本的脚本API供用户编写、测试脚本，Anyproxy不提供任何具体的脚本，为了自身数据安全和数据隐私，请谨慎下载和使用他人的脚本
        2、请勿使用和分享任何有关解密、解锁的脚本，对于由此引起的任何隐私泄漏或其他后果Anyproxy概不负责
        3、请勿将脚本用于任何商业用途或者非法目的，对于此造成的任何后果Anyproxy概不负责
        4、任何使用Anyproxy的用户都应该认真阅读以上声明，Anyproxy有权更改、补充此免责声明的权利，一旦使用Anyproxy的脚本功能便视为同意此声明

        请在下面的输入框中输入 我同意 来继续使用`,
        hint: '我同意',
        value: ''
      });
      if (result && result === '我同意') {
        $storage.put('agreement', {
          result: result,
          time: (new Date()).getTime(),
        });
        return true;
      }
      return false;
    }
    return true;
  }
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
