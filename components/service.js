const helper = require('../helper');

const statusTip = {
  UNKNOW: '未知',
  INIT: '启动中',
  READY: '已启动',
  CLOSED: '已关闭',
};

module.exports = {
  type: 'list',
  title: 'Anyproxy',
  async startProxy() {
    const options = getProxyOption();
    // 启动
    await helper.startHTTPProxy(options);
    if (options.mode === 'VPN') {
      await helper.startSocksProxy(options);
      await $dora.setVPN2Socks(options.host, options.socksPort);
    }
    this.initEventListener();
  },
  async stopProxy() {
    const options = getProxyOption();
    helper.stopHTTPProxy();
    helper.stopSocksProxy();
    if (options.mode === 'VPN') {
      await $dora.closeVPN();
    }
  },
  async fetch() {
    const status = await getProxyStatus();
    return [
      {
        title: 'Anyproxy ' + statusTip[status.status],
        summary:
          status.status === 'READY' && status.status === 'INIT'
            ? '点击关闭'
            : '点击启动',
        onClick: async () => {
          // 切换代理模式
          try {
            if (status.status === 'READY' && status.status === 'INIT') {
              // 关闭
              this.stopProxy();
            } else {
              // 启动
              this.startProxy();
            }
          } catch (error) {
            console.error(error);
          }
          // 刷新页面
          this.refresh();
        },
      },
      {
        title: '代理模式',
        summary: status.options.mode === 'VPN' ? 'VPN' : 'Proxy',
        onClick: async () => {
          $prefs.set('mode', status.options.mode === 'VPN' ? 'proxy' : 'VPN');
          // 设置代理
          if (status === 'READY' && status.status === 'INIT') {
            // 切换代理模式
            if (status.mode === 'VPN') {
              // 启动 socksServer
              if (!status.socksPortInUse) {
                helper.startSocksProxy(status.options);
              }
              // 设置VPN
              await $dora.setVPN2Socks(
                status.options.host,
                status.options.socksPort
              );
            } else {
              // 关闭 VPN
              await $dora.closeVPN();
              // 关闭 socksServer
              helper.stopSocksProxy();
            }
          }
          // 刷新页面
          this.refresh();
        },
      },
      {
        title: '脚本',
        summary: status.options.script ? '已开启' + ' 0个' : '未开启',
        onClick: async () => {
          $prefs.set('script', !status.options.script);
          // 重启代理
          if (status === 'READY' && status.status === 'INIT') {
            try {
              await this.stopProxy();
              await this.startProxy();
            } catch (error) {
              console.error(error);
            }
          }
          // 刷新页面
          this.refresh();
        },
      },
      {
        title: 'MITM',
        summary: '0个域名',
        // onClick: async () => {},
      },
      {
        title: 'HTTP代理端口',
        summary: status.HTTPPortInUse
          ? '已开启/被占用 ' + status.options.host + ':' + status.options.port
          : '未开启',
        // onClick: async () => {},
      },
      {
        title: 'Socks代理端口',
        summary: status.socksPortInUse
          ? '已开启/被占用 ' +
            status.options.host +
            ':' +
            status.options.socksPort
          : '未开启',
        // onClick: async () => {},
      },
    ];
  },
  initEventListener() {
    if (global.anyproxyServer) {
      global.anyproxyServer.on('close', () => {
        this.refresh();
      });
    }
  },
  created() {
    console.log('component created');
    this.initEventListener();
  },
};
