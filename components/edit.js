const rule = require('../rule');

module.exports = {
    type: 'workspace',
    title: '本地脚本',
    path: rule.getScriptPath(),
    async fetch({args}) {
        if (args && args.data) {
            this.path = rule.getDataPath();
        }
    }
};
