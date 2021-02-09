module.exports = {
  type: 'bottomTab',
  title: 'Anyproxy',
  items: [
    {
      title: '服务',
      route: $route('service'),
      image: $assets('component.svg'),
    },
    {
      title: '记录',
      route: $route('record'),
      image: $assets('global.svg'),
    },
    {
      title: '脚本',
      route: $route('script'),
      image: $assets('global.svg'),
    },
    {
      title: '更多',
      route: $route('more'),
      image: $icon('more_vert'),
    },
  ],
  created() {
    console.log('component created');
  },
};
