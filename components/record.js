module.exports = {
  type: 'list',
  title: '抓包记录',
  async fetch() {
    const response = await $http
      .get(`${getWebAPI()}/latestLog`)
      .catch((e) => {
        console.log(e);
      });

    console.log("response.data  ", response.data);
    let data = [];
    if (response) {
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
    return list.map((item) => {
      delete item.reqHeader;
      delete item.reqBody;
      delete item.resHeader;
      return {
        title: item.method + ' ' + item.url,
        summary: '',
        route: $route('recordInfo', {
          id: item.id,
        }),
        ...item,
      };
    });
  },
  created() {},
};
