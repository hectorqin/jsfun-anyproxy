module.exports = {
  type: 'list',
  title: '更多',
  async fetch() {
    return [
      {
        title: '本地脚本管理',
        type: 'simple',
        route: $route('edit'),
      }
    ];
  },
};
