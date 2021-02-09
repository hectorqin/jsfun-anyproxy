module.exports = {
  type: 'list',
  title: '请求详情',
  async fetch({args}) {
    if (!global.anyproxyServer || !global.anyproxyServer.recorder) {
      return [];
    }

    if (!args.id) {
      return [];
    }

    const data = await this.getSingleRecord(args.id);

    return this.transformData(data);
  },
  getSingleRecord(id) {
    return new Promise(function (resolve) {
      global.anyproxyServer.recorder.getSingleRecord(id, function (err, doc) {
        resolve(doc && doc[0] ? doc[0] : null);
      });
    });
  },
  transformData(data) {
    if (!data) {
      return [];
    }

    return [
      {
        title: 'Request',
        type: 'category',
      },
      {
        title: 'General',
        type: 'category',
      },
      {
        title: 'Method: ' + data.method,
        type: 'simple',
      },
      {
        title: 'Host: ' + data.host,
        type: 'simple',
      },
      {
        title: 'URL: ' + data.url,
        type: 'simple',
      },
      {
        title: 'Header',
        type: 'category',
      },
    ];
  },
  created() {},
};
