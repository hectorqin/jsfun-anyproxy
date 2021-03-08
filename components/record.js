module.exports = {
  type: 'list',
  title: '抓包记录',
  filterConnect: !!$prefs.get('hideConnect'),
  actions: [
    {
      id: 'filter',
      title: '过滤',
      // icon: $icon('refresh'),
      onClick() {
        this.filterConnect = !this.filterConnect;
        $prefs.set('hideConnect', this.filterConnect);
        this.refresh();
      }
    }
  ],
  getRecords(idStart, limit) {
    return new Promise(function(resolve, reject) {
      global.anyproxyServer.recorder.getRecords(idStart, limit, (err, docs) => {
        if (err) {
          reject(err.toString());
        } else {
          resolve(docs);
        }
      });
    })
  },
  async fetch({page}) {
    if (!global.anyproxyServer || !global.anyproxyServer.recorder) {
      return [];
    }
    if (page) {
      const lastRecordId = this.items && this.items.length ? this.items[this.items.length - 1].id : null;
      const records = await this.getRecords(lastRecordId - 20, 20).catch(()=>{});

      return {
        nextPage: page + 1,
        items: this.transformData(records || [])
      }
    }
    const records = await this.getRecords(null, 100).catch(()=>{});

    return this.transformData(records || []);
  },
  transformData(list) {
    if (!list) {
      return [];
    }
    const data = [];
    list.map((item) => {
      delete item.reqHeader;
      delete item.reqBody;
      delete item.resHeader;
      if (this.filterConnect && item.method === 'CONNECT') {
        return;
      }
      data.push({
        title: item.method + ' ' + item.url,
        summary: '',
        route: $route('recordInfo', {
          id: item.id,
        }),
        ...item,
      });
    });
    return data;
  },
  created() {
    if (global.eventHub) {
      global.eventHub.on('update', (doc) => {
        this.refresh();
      });
    }
  },
};
