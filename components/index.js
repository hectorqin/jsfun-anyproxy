module.exports = {
  type: 'bottomTab',
  title: 'Anyproxy',
  items: [
    {
      title: '服务',
      route: $route('service'),
      image: $icon('vpn-key'),
    },
    {
      title: '记录',
      route: $route('record'),
      image: $icon('library-books'),
    },
    {
      title: '脚本',
      route: $route('script'),
      image: $icon('script?type=MaterialCommunityIcons'),
    },
    {
      title: '更多',
      route: $route('more'),
      image: $icon('more_vert'),
    },
  ],
  created() {
    // console.log('component created');
  },
};
