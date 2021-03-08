const rule = require('../rule');
let scriptConfig = {};
// {
//   "title": "xx",
//   "type": "http-request",
//   "patern": "^https?://www.baidu.com",
//   "path": "test.js",
//   "includeBody": true,
//   "timeout": 10
// }

module.exports = {
  type: "list",
  title: "添加脚本",
  isAdd: true,
  actions: [
    {
      id: "Save",
      title: "Save",
      // icon: $icon('refresh'),
      async onClick() {
        // 保存脚本
        if (!scriptConfig.title || !scriptConfig.path || !scriptConfig.type || !scriptConfig.patern) {
          $ui.toast("参数错误");
          return;
        }
        if (this.isAdd) {
          rule.addLocalScript(scriptConfig);
          scriptConfig={};
        } else {
          rule.saveLocalScript(scriptConfig);
        }
      },
    },
  ],
  async fetch({args}) {
    if (args.script) {
      scriptConfig = args.script;
      this.isAdd = false;
      this.title = "编辑脚本";
    }
    return [
      {
        title: "名称",
        summary: scriptConfig.title,
        type: "simple",
        async onClick(){
          const title = await $input.prompt({
            title: '请输入脚本名称',
            hint: '名称',
            value: ''
          });
          if (title) {
            scriptConfig.title = title;
            this.refresh();
          }
        }
      },
      {
        title: "类型",
        summary: scriptConfig.type,
        type: "simple",
        async onClick(){
          let selected = await $input.select({
            title: '请选择脚本类型',
            options: [
              {
                id: 'http-request',
                title: 'http-request'
              },
              {
                id: 'http-response',
                title: 'http-response'
              }
            ]
          });
          if (selected) {
            scriptConfig.type = selected.id;
            this.refresh();
          }
        }
      },
      {
        title: "匹配模式",
        summary: scriptConfig.patern,
        type: "simple",
        async onClick(){
          const patern = await $input.prompt({
            title: '请输入匹配模式',
            hint: '匹配模式',
            value: ''
          });
          if (patern) {
            scriptConfig.patern = patern;
            this.refresh();
          }
        }
      },
      {
        title: "脚本路径",
        summary: scriptConfig.path,
        type: "simple",
        async onClick(){
          const path = await $input.prompt({
            title: '请输入脚本路径',
            hint: '脚本路径',
            value: ''
          });
          if (path) {
            scriptConfig.path = path;
            this.refresh();
          }
        }
      },
      {
        title: "超时时间",
        summary: scriptConfig.timeout || 0,
        type: "simple",
        async onClick(){
          const timeout = await $input.number({
            title: '请输入超时时间',
            hint: '超时时间',
            value: ''
          });
          if (timeout) {
            scriptConfig.timeout = timeout;
            this.refresh();
          }
        }
      },
    ];
  },
  created() {
    scriptConfig = {};
  },
};
