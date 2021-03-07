const fs = require('fs');
const path = require('path');
const vm = require('vm');
const request = require('request');

const userData = process.env.DATA_DIR;
const storagePath = path.resolve(userData, 'storage');
const scriptsPath = path.resolve(userData, 'scripts');

if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, {recursive: true});
}

if (!fs.existsSync(scriptsPath)) {
  fs.mkdirSync(scriptsPath, {recursive: true});
}

process.setUncaughtExceptionCaptureCallback(function (error) {
  console.log('uncaughtException:  ', error);
});

const defaultScriptContext = {
  $loon() {
    return {
      version: '999.0.0',
      env: 'anyproxy',
    };
  },
  $notification: {
    post(title, subTitle, content) {
      if (global.__broadcast) {
        global.__broadcast('notification.post', {
          title: title,
          subTitle: subTitle,
          content: content,
        });
      } else {
        console.warn('不支持发送通知的环境');
      }
    },
  },
  $httpClient: request,
  $persistentStore: {
    write(value, key) {
      return fs.writeFileSync(getPath('storage', key), value);
    },
    read(key) {
      if (!fs.existsSync(getPath('storage', key))) {
        return null;
      }
      return fs.readFileSync(getPath('storage', key));
    },
    remove(key) {
      fs.rmSync(getPath('storage', key));
    },
  },
  console: console,
  JSON: JSON,
};

let localScripts;
let mitmHosts;

function getPath() {
  return path.resolve(userData, ...arguments);
}

// [
//   {
//     title: 'xx',
//     type: 'http-request|http-response',
//     patern: '^http://www.baidu.com',
//     path: 'xx.js',
//     includeBody: true,
//     timeout: 10,
//   },
// ];
function getLocalScripts(type) {
  if (!localScripts) {
    try {
      localScripts = JSON.parse(fs.readFileSync(getPath('script.json')));
    } catch (error) {
      console.info('未配置脚本列表，初始化为{}');
      fs.writeFileSync(getPath('script.json'), '{}');
      localScripts = {};
    }
  }
  if (!type) {
    return localScripts;
  }
  return localScripts[type] || [];
}

function getLocalScriptsCount() {
  const scripts = getLocalScripts();
  return (scripts['http-request'] || []).length + (scripts['http-response'] || []).length
}

function getMITMHosts() {
  if (!mitmHosts) {
    try {
      mitmHosts = JSON.parse(fs.readFileSync(getPath('mitm.json')));
    } catch (error) {
      console.info('未配置 MITM 域名，初始化为[]');
      fs.writeFileSync(getPath('mitm.json'), '[]');
      mitmHosts = [];
    }
  }
  return mitmHosts;
}

function getMITMHostsCount() {
  const hosts = getMITMHosts();
  return hosts.length;
}

function getScriptContent(scriptPath) {
  if (!scriptPath) {
    return;
  }
  const scriptFile = getPath('scripts', scriptPath);
  if (!fs.existsSync(scriptFile)) {
    return;
  }
  return fs.readFileSync(scriptFile);
}

function runScript(script, context) {
  try {
    console.info('运行脚本 ', script.title);
    const scriptContent = getScriptContent(script.path);
    const vmScript = new vm.Script(scriptContent);
    context = Object.assign({}, defaultScriptContext, context);
    vm.createContext(context);
    vmScript.runInNewContext(context, {
      timeout: script.timeout || 10,
      microtaskMode: 'afterEvaluate',
    });
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  summary: 'Loon script adapter',
  getDataPath() {
    return userData;
  },
  getScriptPath() {
    return scriptsPath;
  },
  resetLocalScript() {
    localScripts = null;
  },
  resetMITMHosts() {
    mitmHosts = null;
  },
  getLocalScripts: getLocalScripts,
  getLocalScriptsCount: getLocalScriptsCount,
  getMITMHosts: getMITMHosts,
  getMITMHostsCount: getMITMHostsCount,
  addLocalScript(scriptConfig) {
    if (!scriptConfig.title || !scriptConfig.path || !scriptConfig.type || !scriptConfig.patern) {
      return;
    }
    if (scriptConfig.type !== 'http-request' && scriptConfig.type !== 'http-response') {
      return;
    }
    localScripts = getLocalScripts();
    localScripts[scriptConfig.type] = localScripts[scriptConfig.type] || [];
    localScripts[scriptConfig.type].push(scriptConfig);
    fs.writeFileSync(getPath('script.json'), JSON.stringify(localScripts, null ,4));
    this.resetLocalScript();
  },
  deleteLocalScript(scriptConfig) {
    const list = getLocalScripts(scriptConfig.type);
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (s.title === scriptConfig.title) {
        list.splice(i, 1);
      }
    }
    localScripts[scriptConfig.type] = list;
    fs.writeFileSync(getPath('script.json'), JSON.stringify(localScripts, null ,4));
    this.resetLocalScript();
  },
  addMITMHost(host) {
    mitmHosts = getMITMHosts();
    mitmHosts.push(host);
    fs.writeFileSync(getPath('mitm.json'), JSON.stringify(mitmHosts, null ,4));
    this.resetMITMHosts();
  },
  deleteMITMHost(host) {
    mitmHosts = getMITMHosts();
    for (let i = 0; i < mitmHosts.length; i++) {
      const s = list[i];
      if (s === host) {
        mitmHosts.splice(i, 1);
      }
    }
    fs.writeFileSync(getPath('mitm.json'), JSON.stringify(mitmHosts, null ,4));
    this.resetMITMHosts();
  },
  // {
  //   host: "www.baidu.com",
  //   _req: { /* ... */}
  // }
  beforeDealHttpsRequest(requestDetail) {
    return new Promise(function (resolve) {
      const hosts = getMITMHosts();
      const result = hosts.some(function (h) {
        if (h === '*') {
          return true;
        }
        // .www.baidu.com  match  com
        // .www.baidu.com  match  .baidu.com
        // .api.baidu.com  match  .baidu.com
        // .b.api.baidu.com  match  .api.baidu.com
        return ('.' + requestDetail.host).indexOf('.' + h) !== -1;
      });
      resolve(result);
    });
  },
  // {
  //   protocol: 'http',
  //   url: 'http://anyproxy.io/',
  //   requestOptions: {
  //     hostname: 'anyproxy.io',
  //     port: 80,
  //     path: '/',
  //     method: 'GET',
  //     headers: {
  //       Host: 'anyproxy.io',
  //       'Proxy-Connection': 'keep-alive',
  //       'User-Agent': '...'
  //     }
  //   },
  //   requestData: '...',
  //   _req: { /* ... */}
  // }
  beforeSendRequest(requestDetail) {
    const scripts = getLocalScripts('http-request');
    let modified = {};
    return new Promise(function (resolve) {
      const context = {
        $request: Object.assign(
          {
            protocol: requestDetail.protocol,
            url: requestDetail.url,
            requestData: requestDetail.requestData,
          },
          requestDetail.requestOptions
        ),
        $done(options) {
          //  null || {response} || {protocol, requestOptions, requestData} || {RequestHeaders}
          if (options.RequestHeaders) {
            const requestOptions = Object.assign(
              {headers: options.RequestHeaders},
              requestDetail.requestOptions
            );
            options = {requestOptions: requestOptions};
          }
          modified = Object.assign(modified, options || {});
        },
      };
      for (let index = 0; index < scripts.length; index++) {
        const script = scripts[index];
        const regexp = script.regexp || new RegExp(script.patern);
        script.regexp = regexp;
        if (regexp.test(requestDetail.url)) {
          // 合并上个脚本的修改
          if (modified.response) {
            context.$request.response = modified.response;
          } else {
            context.$request.protocol = modified.protocol;
            context.$request.requestData = modified.requestData;
            context.$request = Object.assign(
              context.$request,
              modified.requestOptions
            );
          }
          runScript(script, context);
        }
      }
      resolve(JSON.stringify(modified) === '{}' ? null : modified);
    });
  },
  // {
  //   response: {
  //     statusCode: 200,
  //     header: {
  //       'Content-Type': 'image/gif',
  //       Connection: 'close',
  //       'Cache-Control': '...'
  //     },
  //     body: '...'
  //   },
  //   _res: { /* ... */ }
  // }
  beforeSendResponse(requestDetail, responseDetail) {
    const scripts = getLocalScripts('http-response');
    let modified = {};
    return new Promise(function (resolve) {
      const context = {
        $request: Object.assign(
          {
            protocol: requestDetail.protocol,
            url: requestDetail.url,
          },
          requestDetail.requestOptions
        ),
        $response: responseDetail.response,
        $done(options) {
          //  null || {response} || {RespnseBodyData}
          if (options.RespnseBodyData) {
            const response = Object.assign(
              {body: options.RespnseBodyData},
              responseDetail.response
            );
            options = {response: response};
          }
          modified = Object.assign(modified, options || {});
        },
      };
      for (let index = 0; index < scripts.length; index++) {
        const script = scripts[index];
        const regexp = script.regexp || new RegExp(script.patern);
        script.regexp = regexp;
        if (regexp.match(requestDetail.url)) {
          // 合并上个脚本的修改
          context.$response = Object.assign(context.$response, modified || {});
          runScript(script, context);
        }
      }
      resolve(JSON.stringify(modified) === '{}' ? null : modified);
    });
  },
};
