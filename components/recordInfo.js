module.exports = {
  type: 'topTab',
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
    let requestItems = [];
    let responseItems = [];
    if (data) {
      requestItems = [
        {
          title: 'General',
          type: 'category',
          itemStyle: {
            fontWeight: '800',
            backgroundColor: '#e2e2e2',
          }
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
          itemStyle: {
            fontWeight: '800',
            backgroundColor: '#e2e2e2',
          }
        },
        ...Object.keys(data.reqHeader).map((item) => {
          return {
            title: item + ': ' + data.reqHeader[item],
            type: 'simple',
          };
        }),
        {
          title: 'Body',
          type: 'category',
          itemStyle: {
            fontWeight: '800',
            backgroundColor: '#e2e2e2',
          },
          action: data.method === 'POST' || data.method === 'PUT' ? {
            title: '点击查看请求Body',
            onClick() {
              $ui.browser(`${getWebAPI()}/fetchReqBody?id=${data.id}`);
            }
          } : {}
        },
        {
          title: data.reqBody,
          type: 'simple',
        },
      ];
      responseItems = [
        {
          title: 'General',
          type: 'category',
          itemStyle: {
            fontWeight: '800',
            backgroundColor: '#e2e2e2',
          },
        },
        {
          title: 'statusCode: ' + data.statusCode,
          type: 'simple',
        },
        {
          title: 'Header',
          type: 'category',
          itemStyle: {
            fontWeight: '800',
            backgroundColor: '#e2e2e2',
          },
        },
        ...Object.keys(data.resHeader).map((item) => {
          return {
            title: item + ': ' + data.resHeader[item],
            type: 'simple',
          };
        }),
        {
          title: 'Body',
          type: 'category',
          itemStyle: {
            fontWeight: '800',
            backgroundColor: '#e2e2e2',
          },
          action: {
            title: '点击查看响应Body',
            onClick() {
              $ui.browser(`${getWebAPI()}/downloadBody?id=${data.id}&raw=true`);
            }
          }
        }
      ];
    }
    return [
      {
        title: 'Reqeust',
        route: $route('@list', {
          items: requestItems,
        }),
      },
      {
        title: 'Response',
        route: $route('@list', {
          items: responseItems,
        }),
      },
    ];
  },
  created() {},
};
