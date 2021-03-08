const helper = require('../helper')

module.exports = {
  type: "list",
  title: "白/黑名单管理",
  selectedApplications: new Set(),
  applicationList: [],
  actions: [
    {
      id: "Save",
      title: "Save",
      // icon: $icon('refresh'),
      async onClick() {
        // 保存名单
        const VPNConfig = helper.getVPNConfig();
        VPNConfig.applications = Array.from(this.selectedApplications);
        helper.saveVPNConfig(VPNConfig);
      },
    },
  ],
  async fetch() {
    return this.aplicationList.map((item, index)=>{
        return {
            title: item.appName,
            summary: item.packageName + "  " + item.versionName,
            type: 'simple',
            itemStyle: {
                backgroundColor: this.selectedApplications.has(item.packageName) ? "#31d18c" : "#fff"
            },
            async onClick() {
                if (this.selectedApplications.has(item.packageName)) {
                    this.selectedApplications.delete(item.packageName);
                } else {
                    this.selectedApplications.add(item.packageName);
                }
                this.refresh();
            },
            async onLongClick() {

            }
        }
    })
  },
  async beforeCreate() {
    const VPNConfig = helper.getVPNConfig();
    this.selectedApplications = new Set(VPNConfig.applications || []);

    this.aplicationList = await $vpn.getPackageList();
  }
};
