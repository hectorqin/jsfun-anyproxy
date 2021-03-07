const rule = require('../rule');

module.exports = {
  type: "list",
  title: "MITM Hosts管理",
  actions: [
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
    return hosts.map((item)=>{
        return {
            title: item,
            type: 'simple',
            async onClick() {
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
