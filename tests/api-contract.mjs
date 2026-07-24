import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { apiEndpoints } from '../src/api/contracts.js'

const contractPath =
  process.env.SERVICE_CONTRACT_PATH ||
  resolve('..', 'trading-toolkit-service', 'contracts', 'http-api.json')
const contract = JSON.parse(await readFile(contractPath, 'utf8'))
const declared = new Set(
  contract.endpoints.map(({ method, path }) => `${method} ${path}`)
)

function endpointDefinitions(value) {
  if (
    value &&
    typeof value === 'object' &&
    'method' in value &&
    'path' in value
  ) {
    return [value]
  }
  return Object.values(value).flatMap(endpointDefinitions)
}

for (const { method, path } of endpointDefinitions(apiEndpoints)) {
  assert.ok(
    declared.has(`${method} ${path}`),
    `Service contract does not declare ${method} ${path}`
  )
}
