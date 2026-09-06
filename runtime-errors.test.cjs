const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Easyhook } = require('./dist/nodes/Easyhook/Easyhook.node.js');

const node = { name: 'Easyhook', type: 'n8n-nodes-easyhook.easyhook', typeVersion: 1, position: [0, 0], parameters: {} };
const body = { error: 'telecom_destination_not_available', request_id: 'qa-request-1', retryable: false, delivery_state: 'not_sent' };
function execute(failure, continueOnFail = true) {
  return new Easyhook().execute.call({
    getNode: () => node,
    getInputData: () => [{ json: {} }],
    getNodeParameter: (key, _index, fallback) => ({ resource: 'voiceCall', operation: 'getCall', callId: 'qa-call' })[key] ?? fallback,
    continueOnFail: () => continueOnFail,
    helpers: { httpRequestWithAuthentication: async () => { throw failure; } },
  });
}

for (const [shape, failure] of Object.entries({
  body: { statusCode: 409, response: { body } },
  axios: { response: { status: 409, data: body } },
  json: { statusCode: 409, response: { body: JSON.stringify(body) } },
  reason: { reason: { statusCode: 409, error: body } },
})) {
  test(`preserves normalized diagnostics from ${shape} in continue-on-fail output`, async () => {
    const [[result]] = await execute(failure);
    assert.deepEqual(result, { json: {
      error: 'telecom_destination_not_available · request_id: qa-request-1',
      error_code: body.error, request_id: body.request_id,
      retryable: false, delivery_state: 'not_sent', http_status: 409,
    }, pairedItem: { item: 0 } });
  });
}

test('stopped execution preserves the code and request ID instead of a generic HTTP message', async () => {
  await assert.rejects(execute({ statusCode: 409, response: { body } }, false), (error) => {
    assert.match(error.message, /telecom_destination_not_available.*qa-request-1/);
    assert.equal(error.httpCode, '409');
    return true;
  });
});

test('never copies HTTP credentials or arbitrary response fields into diagnostic output', async () => {
  const [[result]] = await execute({
    statusCode: 409, config: { headers: { Authorization: 'secret-test-key' } },
    response: { body: { ...body, provider_token: 'private-token', message: 'private response content' } },
  });
  assert.doesNotMatch(JSON.stringify(result), /secret-test-key|private-token|private response content|Authorization/);
});

test('non-JSON transport errors remain errors', async () => {
  const [[result]] = await execute(new Error('Connection failed'));
  assert.equal(typeof result.json.error, 'string');
  assert.equal(result.json.error_code, undefined);
});
