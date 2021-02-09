var os = require('os');
var LRU = require('lru-cache');

var LOCALHOST = '127.0.0.1';
var localIpCache = new LRU({max: 120});
var addressList = [];
var interfaces = os.networkInterfaces();

(function updateSystyemInfo() {
  interfaces = os.networkInterfaces();
  addressList = [];
  for (var i in interfaces) {
    var list = interfaces[i];
    if (Array.isArray(list)) {
      list.forEach(function (info) {
        addressList.push(info.address.toLowerCase());
      });
    }
  }
  setTimeout(updateSystyemInfo, 30000);
})();

function isLocalIp(ip) {
  if (!ip || typeof ip !== 'string') {
    return true;
  }
  return ip.length < 7 || ip === LOCALHOST;
}

function isLocalAddress(address) {
  if (isLocalIp(address)) {
    return true;
  }
  address = address.toLowerCase();
  if (address[0] === '[') {
    address = address.slice(1, -1);
  }
  if (address === '0:0:0:0:0:0:0:1') {
    return true;
  }
  return localIpCache.get(address) || addressList.indexOf(address) !== -1;
}

exports.isLocalAddress = isLocalAddress;

function isLocalHost(host) {
  return host === 'localhost' || isLocalAddress(host);
}

exports.isLocalHost = isLocalHost;
