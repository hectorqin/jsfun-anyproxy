const certMgr = require('anyproxy/lib/certMgr')

module.exports = {
  type: 'list',
  title: '更多',
  async fetch() {
    const certExists = certMgr.ifRootCAFileExists();
    return [
      {
        title: '本地脚本管理',
        type: 'simple',
        route: $route('edit'),
      },
      {
        title: 'Data目录管理',
        type: 'simple',
        route: $route('edit', {
          data: true
        }),
      },
      {
        title: 'HTTPS证书',
        type: 'simple',
        summary: certExists ? "已生成" : "未生成",
        async onClick() {
          if (!certExists) {
            certMgr.generateRootCA(function(error, keyPath, crtPath) {
              if (!error) {
                $ui.toast("证书生成成功");
              } else {
                $ui.toast("证书生成出错 " + error);
              }
            });
          }
        }
      },
      {
        title: '安装HTTPS证书',
        type: 'simple',
        summary: "点击安装HTTPS证书",
        async onClick() {
          if (!certExists) {
            certMgr.generateRootCA(function(error, keyPath, crtPath) {
              if (!error) {
                $ui.toast("证书生成成功");
                // 安装
                $ui.browser(`${getWebAPI()}/fetchCrtFile`);
                $ui.toast("证书安装后，请去系统设置信任证书");
              } else {
                $ui.toast("证书生成出错 " + error);
              }
            });
          } else {
            // 安装
            $ui.browser(`${getWebAPI()}/fetchCrtFile`);
            $ui.toast("证书安装后，请去系统设置信任证书");
          }
        }
      },
      {
        title: '退出',
        type: 'simple',
        summary: "点击将会终止扩展运行",
        onClick() {
          if (global.eventHub) {
            global.eventHub.emit('stopProxy');
          }
          process.exit();
        }
      }
    ];
  },
};
