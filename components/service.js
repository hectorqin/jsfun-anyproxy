const helper = require('../helper');
const rule = require('../rule');

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
    console.log("startHTTPProxy  ", options);
    await helper.startHTTPProxy(options);
    this.refresh();
    if (options.mode === 'VPN') {
      console.log("startSocksProxy ");
      await helper.startSocksProxy(options);
      console.log("setVPN2Socks ");
      await helper.setVPN2Socks(options.host, options.socksPort);
    }
    console.log("startProxy success ");
    this.initEventListener();
  },
  async stopProxy() {
    const options = getProxyOption();
    if (options.mode === 'VPN') {
      await helper.stopTunnel();
    }
    helper.stopSocksProxy();
    helper.stopHTTPProxy();
  },
  async fetch() {
    const status = await getProxyStatus();
    // console.log("getProxyStatus", status);
    return [
      {
        title: 'Anyproxy ' + statusTip[status.status],
        summary:
          (status.status === 'READY' || status.status === 'INIT')
            ? '点击关闭'
            : '点击启动',
        onClick: async () => {
          // 切换代理模式
          try {
            if (status.status === 'READY' || status.status === 'INIT') {
              // 关闭
              await this.stopProxy();
            } else {
              // 启动
              await this.startProxy();
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
          if (status.status === 'READY' || status.status === 'INIT') {
            // 切换代理模式
            if (status.options.mode !== 'VPN') {
              // 启动 socksServer
              if (!status.socksPortInUse) {
                await helper.startSocksProxy(status.options);
              }
              // 设置VPN
              await helper.setVPN2Socks(
                status.options.host,
                status.options.socksPort
              );
            } else {
              // 关闭 VPN
              await helper.stopTunnel();
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
        summary: status.options.script ? '已开启' + ' ' + rule.getLocalScriptsCount() + '个' : '未开启',
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
        summary: rule.getMITMHostsCount() + '个域名',
        route: $route('mitm'),
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
