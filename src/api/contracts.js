function endpoint(method, path) {
  return Object.freeze({ method, path })
}

export const apiEndpoints = Object.freeze({
  health: endpoint('GET', '/healthz'),
  market: Object.freeze({
    overview: endpoint('GET', '/api/v1/market/overview'),
    sentiment: endpoint('GET', '/api/v1/market/sentiment'),
    fundFlow: endpoint('GET', '/api/v1/market/fund-flow')
  }),
  convertible: Object.freeze({
    list: endpoint('GET', '/api/v1/convertible/list'),
    signals: endpoint('GET', '/api/v1/convertible/signals'),
    temperature: endpoint('GET', '/api/v1/convertible/temperature'),
    detail: endpoint('GET', '/api/v1/convertible/detail/:code'),
    pending: endpoint('GET', '/api/v1/convertible/pending')
  }),
  placement: Object.freeze({
    sync: endpoint('POST', '/api/v1/placement/sync'),
    list: endpoint('GET', '/api/v1/placement/list')
  }),
  lof: Object.freeze({
    list: endpoint('GET', '/api/v1/lof/list'),
    opportunities: endpoint('GET', '/api/v1/lof/opportunities'),
    summary: endpoint('GET', '/api/v1/lof/summary'),
    shareHistory: endpoint('GET', '/api/v1/lof/:code/share-history'),
    arbitragePredict: endpoint('GET', '/api/v1/lof/:code/arbitrage-predict')
  }),
  hkipo: Object.freeze({
    sync: endpoint('POST', '/api/v1/hkipo/sync'),
    list: endpoint('GET', '/api/v1/hkipo/list'),
    upcoming: endpoint('GET', '/api/v1/hkipo/upcoming'),
    summary: endpoint('GET', '/api/v1/hkipo/summary'),
    detail: endpoint('GET', '/api/v1/hkipo/detail/:code')
  }),
  closedEnd: Object.freeze({
    list: endpoint('GET', '/api/v1/closed-end/list'),
    summary: endpoint('GET', '/api/v1/closed-end/summary')
  }),
  user: Object.freeze({
    login: endpoint('POST', '/api/v1/user/login'),
    favorites: endpoint('GET', '/api/v1/user/favorites')
  })
})

export function endpointPath(endpointDefinition, params = {}) {
  return endpointDefinition.path.replace(
    /:([A-Za-z][A-Za-z0-9_]*)/g,
    (match, name) => {
      if (!(name in params)) {
        throw new Error(`Missing API path parameter: ${name}`)
      }
      return encodeURIComponent(params[name])
    }
  )
}
