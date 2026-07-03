export function analyzeBaseUrl(url) {
  if (!url) return { valid: false, type: 'empty', hint: '后端地址为空，请先到「设置」页配置云托管地址' }
  if (url.indexOf('your-service-id') !== -1 || url.indexOf('example.com') !== -1) {
    return { valid: false, type: 'placeholder', hint: '后端地址为占位符，请到「设置」页填写真实地址' }
  }
  if (url.indexOf('localhost') !== -1 || url.indexOf('127.0.0.1') !== -1) {
    return { valid: true, type: 'localhost', hint: '使用本机地址，请确认后端服务正在运行' }
  }
  if (/https?:\/\/(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))\./.test(url)) {
    return { valid: true, type: 'lan', hint: '使用局域网地址，请确认手机与电脑在同一网络，且电脑 IP 正确' }
  }
  if (url.indexOf('https://') === 0) {
    return { valid: true, type: 'cloud', hint: '使用云托管地址，请确认服务已部署' }
  }
  return { valid: true, type: 'http', hint: '使用 HTTP 地址，请确认服务可访问' }
}

export function parseRequestError(err, baseUrlInfo) {
  const msg = (err && err.message) || String(err || '未知错误')
  if (msg.indexOf('timeout') !== -1) {
    return { title: '请求超时', detail: '后端响应超过 10 秒，可能服务卡死或网络过慢', code: 'timeout' }
  }
  if (msg.indexOf('ECONNREFUSED') !== -1 || msg.indexOf('refused') !== -1 || msg.indexOf('Network Error') !== -1) {
    if (baseUrlInfo.type === 'localhost') {
      return { title: '无法连接本机后端', detail: '后端服务未启动或端口不对，请确认已运行 python app.py', code: 'refused' }
    }
    if (baseUrlInfo.type === 'lan') {
      return { title: '无法连接后端', detail: '电脑 IP 变更、防火墙拦截或手机与电脑不在同一网络', code: 'refused' }
    }
    return { title: '无法连接后端', detail: '服务未部署或地址不可达', code: 'refused' }
  }
  if (msg.indexOf('ERR_') !== -1) {
    return { title: '网络错误', detail: msg, code: 'net' }
  }
  return { title: '请求失败', detail: msg, code: 'other' }
}
