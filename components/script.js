const rule = require('../rule');

module.exports = {
  type: 'list',
  title: '脚本',
  async fetch() {
    const httpRequest = rule.getLocalScripts('http-request');
    const httpResponse = rule.getLocalScripts('http-response');
    return [
      {
        title: 'HTTP-Reqeust',
        type: 'general',
      },
      ...httpRequest.map((item) => {
        return {
          title: item.title,
          summary: '脚本: ' + item.path,
          type: 'simple',
        };
      }),
      {
        title: 'HTTP-Response',
        type: 'general',
      },
      ...httpResponse.map((item) => {
        return {
          title: item.title,
          summary: '脚本: ' + item.path,
          type: 'simple',
        };
      }),
    ];
  },
};
