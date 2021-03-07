module.exports = {
  type: 'list',
  title: '更多',
  async fetch() {
    return [
      {
        title: '本地脚本管理',
        type: 'simple',
        route: $route('edit'),
      },
      {
        title: 'Data目录管理',
        type: 'simple',
        route: $route('edit', {
          data: true
        }),
      }
    ];
  },
};
