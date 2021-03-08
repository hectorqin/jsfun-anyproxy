const rule = require('../rule');

module.exports = {
  type: "list",
  title: "MITM Hosts管理",
  actions: [
    {
      id: "Refresh",
      title: "Refresh",
      // icon: $icon('refresh'),
      async onClick() {
        rule.resetMITMHosts();
        this.refresh();
      },
    },
    {
      id: "Add",
      title: "Add",
      // icon: $icon('refresh'),
      async onClick() {
        // 添加 host
        const host = await $input.prompt({
            title: '请输入host',
            hint: 'host',
            value: ''
        });
        if (host) {
          rule.addMITMHost(host);
        }
      },
    },
  ],
  async fetch() {
    const hosts = rule.getMITMHosts();
    return hosts.map((item, index)=>{
        return {
            title: item,
            type: 'simple',
            async onClick() {
              const host = await $input.prompt({
                title: '请输入host',
                hint: 'host',
                value: item
              });
              if (host) {
                rule.saveMITMHost(host, index);
              }
            },
            async onLongClick() {
                let ok = await $input.confirm({
                    title: '操作确认',
                    message: '确认要删除吗?',
                    okBtn: '确定'
                });
                if (ok) {
                    rule.deleteMITMHost(item);
                }
            }
        }
    })
  },
};
