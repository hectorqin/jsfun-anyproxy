const helper = require('../helper');
const { getProxyOption } = require('../main');
const rule = require('../rule');

const statusTip = {
  UNKNOW: '未知',
  INIT: '启动中',
  READY: '已启动',
  CLOSED: '已关闭',
};

const vpnModeTip = ["全局", "白名单", "黑名单"];

const VPN2SOCKS="vpn2socks";
const VPN2HTTP="vpn2http";

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
      await this.startVPNTunnel(options);
    }
    if (global.eventHub) {
      global.eventHub.emit('proxyStarted');
    }
    console.log("startProxy success ");
  },
  async stopProxy() {
    const options = getProxyOption();
    if (options.mode === 'VPN') {
      await helper.stopVPNTunnel();
    }
    helper.stopSocksProxy();
    helper.stopHTTPProxy();
    if (global.eventHub) {
      global.eventHub.emit('proxyStoped');
    }
  },
  async startVPNTunnel(options) {
    options = options || getProxyOption();
    console.log("startVPNTunnel ");
    await helper.startVPNTunnel({
      host: options.host,
      port: options.tunnelType === VPN2SOCKS ? options.socksPort : options.port,
      type: options.tunnelType === VPN2SOCKS ? 1 : 2,
      vpnMode: $prefs.get('vpnMode')
    });
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
              // 启动 VPN
              await this.startVPNTunnel(status.options);
            } else {
              // 关闭 VPN
              await helper.stopVPNTunnel();
              // 关闭 socksServer
              helper.stopSocksProxy();
            }
          }
          // 刷新页面
          this.refresh();
        },
      },
      status.options.mode === 'VPN' ? {
        title: 'VPN模式',
        summary: vpnModeTip[status.options.vpnMode] + "模式",
        onClick: async () => {
          let selected = await $input.select({
            title: '请选择VPN模式',
            options: [
              {
                id: 0,
                title: '全局模式'
              },
              {
                id: 1,
                title: '白名单模式'
              },
              {
                id: 2,
                title: '黑名单模式'
              }
            ]
          });
          if (selected) {
            $prefs.set("vpnMode", selected.id);
            this.refresh();
            // 关闭 VPN
            await helper.stopVPNTunnel();
            // 启动 VPN
            await this.startVPNTunnel();
          }
        }
      } : null,
      status.options.mode === 'VPN' ? {
        title: 'VPNTunnel模式',
        summary: status.options.tunnelType,
        onClick: async () => {
          let selected = await $input.select({
            title: '请选择VPNTunnel模式',
            options: [
              {
                id: 'vpn2socks',
                title: 'vpn2socks'
              },
              {
                id: 'vpn2http',
                title: 'vpn2http'
              }
            ]
          });
          if (selected) {
            $prefs.set("tunnelType", selected.id);
            this.refresh();
            // 关闭 VPN
            await helper.stopVPNTunnel();
            // 启动 VPN
            await this.startVPNTunnel();
          }
        }
      } : null,
      status.options.mode === 'VPN' && status.options.vpnMode ? {
        title: "管理" + vpnModeTip[status.options.vpnMode],
        summary: "点击管理",
        route: $route('application'),
      } : null,
      {
        title: '脚本',
        summary: status.options.script ? '已开启' + ' ' + rule.getLocalScriptsCount() + '个' : '未开启',
        onClick: async () => {
          $prefs.set('script', !status.options.script);
          rule.setScriptEnabled($prefs.get('script'));
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
    ].filter(v=>v);
  },
  initEventListener() {
    if (global.eventHub) {
      global.eventHub.on('proxyStoped', () => {
        this.refresh();
      });
      global.eventHub.on('stopProxy', () => {
        this.stopProxy();
      });
    }
  },
  created() {
    this.initEventListener();
  },
};
