module.exports = {
  type: 'list',
  title: '抓包记录',
  filterConnect: false,
  actions: [
    {
      id: 'filter',
      title: '过滤',
      // icon: $icon('refresh'),
      onClick() {
        this.filterConnect = !this.filterConnect;
        this.refresh();
      }
    }
  ],
  async fetch() {
    const response = await $http
      .get(`${getWebAPI()}/latestLog`)
      .catch((e) => {
        console.log(e);
      });

    let data = [];
    if (response) {
      console.log("response.data  ", response.data);
      try {
        data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      } catch (error) {}
    }

    return this.transformData(data);
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
  created() {},
};
