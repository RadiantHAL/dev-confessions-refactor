/**
 * Direct Unit & Contract Tests (Mock Req/Res)
 * Validates controllers, services, error handling, status codes, and data persistence.
 */

const confessionService = require('../services/confessionService');
const confessionController = require('../controllers/confessionController');

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

let passed = 0;
let failed = 0;

function assert(testName, condition, actual, expected) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    console.error(`   Expected:`, expected);
    console.error(`   Actual:  `, actual);
    failed++;
  }
}

async function run() {
  console.log('--- Unit & Controller Contract Tests ---\n');

  // Test 1: Empty payload
  {
    const req = { body: null };
    const res = createMockRes();
    confessionController.createConfession(req, res);
    assert('POST without body returns 400 {msg: "bad"}', res.statusCode === 400 && res.body.msg === 'bad', res.body, { msg: 'bad' });
  }

  // Test 2: Missing text
  {
    const req = { body: { category: 'bug' } };
    const res = createMockRes();
    confessionController.createConfession(req, res);
    assert('POST without text returns 400 {msg: "need text"}', res.statusCode === 400 && res.body.msg === 'need text', res.body, { msg: 'need text' });
  }

  // Test 3a: Empty string "" returns { msg: 'need text' } because "" is falsy in if (d.text)
  {
    const req = { body: { text: '', category: 'bug' } };
    const res = createMockRes();
    confessionController.createConfession(req, res);
    assert('POST with empty string returns 400 {msg: "need text"}', res.statusCode === 400 && res.body.msg === 'need text', res.body, { msg: 'need text' });
  }

  // Test 3b: Array with length 0 returns "too short"
  {
    const req = { body: { text: [], category: 'bug' } };
    const res = createMockRes();
    confessionController.createConfession(req, res);
    assert('POST with empty array text returns 400 "too short"', res.statusCode === 400 && res.body === 'too short', res.body, 'too short');
  }

  // Test 4: Text length >= 500
  {
    const req = { body: { text: 'x'.repeat(500), category: 'bug' } };
    const res = createMockRes();
    confessionController.createConfession(req, res);
    assert('POST with text >= 500 returns 400 custom message', res.statusCode === 400 && res.body.error === 'text too big, must be less than 500 characters long buddy', res.body, 'too big error');
  }

  // Test 5: Invalid category
  {
    const req = { body: { text: 'Some bug', category: 'unsupported' } };
    const res = createMockRes();
    confessionController.createConfession(req, res);
    assert('POST with invalid category returns 400 "category not in stuff"', res.statusCode === 400 && res.body === 'category not in stuff', res.body, 'category not in stuff');
  }

  // Test 6: Valid confession 1
  let item1;
  {
    const req = { body: { text: 'I push directly to main.', category: 'vibe-code' } };
    const res = createMockRes();
    confessionController.createConfession(req, res);
    item1 = res.body;
    assert('POST valid item 1 returns 201 with id 1', res.statusCode === 201 && item1.id === 1 && item1.text === 'I push directly to main.', res.body, 'item 1');
  }

  // Test 7: Valid confession 2
  let item2;
  {
    const req = { body: { text: 'Forgot a semicolon in production.', category: 'bug' } };
    const res = createMockRes();
    confessionController.createConfession(req, res);
    item2 = res.body;
    assert('POST valid item 2 returns 201 with id 2', res.statusCode === 201 && item2.id === 2, res.body, 'item 2');
  }

  // Test 8: Get all
  {
    const req = {};
    const res = createMockRes();
    confessionController.getAllConfessions(req, res);
    assert('GET all returns count: 2 and newest first', res.statusCode === 200 && res.body.count === 2 && res.body.data[0].id === 2, res.body, 'count 2');
  }

  // Test 9: Get by ID (found)
  {
    const req = { params: { id: '1' } };
    const res = createMockRes();
    confessionController.getConfessionById(req, res);
    assert('GET id 1 returns 200 item 1', res.statusCode === 200 && res.body.id === 1, res.body, item1);
  }

  // Test 10: Get by ID (not found)
  {
    const req = { params: { id: '999' } };
    const res = createMockRes();
    confessionController.getConfessionById(req, res);
    assert('GET id 999 returns 404 {msg: "not found"}', res.statusCode === 404 && res.body.msg === 'not found', res.body, { msg: 'not found' });
  }

  // Test 11: Get by category (valid)
  {
    const req = { params: { cat: 'bug' } };
    const res = createMockRes();
    confessionController.getConfessionsByCategory(req, res);
    assert('GET category bug returns array length 1', res.statusCode === 200 && Array.isArray(res.body) && res.body.length === 1 && res.body[0].category === 'bug', res.body, 'array of 1');
  }

  // Test 12: Get by category (invalid)
  {
    const req = { params: { cat: 'fake-cat' } };
    const res = createMockRes();
    confessionController.getConfessionsByCategory(req, res);
    assert('GET invalid category returns 400 {msg: "invalid category"}', res.statusCode === 400 && res.body.msg === 'invalid category', res.body, { msg: 'invalid category' });
  }

  // Test 13: Delete without token header
  {
    const req = { params: { id: '1' }, headers: {} };
    const res = createMockRes();
    confessionController.deleteConfession(req, res);
    assert('DELETE without token returns 403 {msg: "no permission"}', res.statusCode === 403 && res.body.msg === 'no permission', res.body, { msg: 'no permission' });
  }

  // Test 14: Delete with wrong token
  {
    const req = { params: { id: '1' }, headers: { 'x-delete-token': 'wrong' } };
    const res = createMockRes();
    confessionController.deleteConfession(req, res);
    assert('DELETE with wrong token returns 403 {msg: "no permission"}', res.statusCode === 403 && res.body.msg === 'no permission', res.body, { msg: 'no permission' });
  }

  // Test 15: Delete non-existent ID
  {
    const req = { params: { id: '999' }, headers: { 'x-delete-token': 'supersecret123' } };
    const res = createMockRes();
    confessionController.deleteConfession(req, res);
    assert('DELETE non-existent returns 404 {msg: "not found buddy"}', res.statusCode === 404 && res.body.msg === 'not found buddy', res.body, { msg: 'not found buddy' });
  }

  // Test 16: Delete existing ID
  {
    const req = { params: { id: '1' }, headers: { 'x-delete-token': 'supersecret123' } };
    const res = createMockRes();
    confessionController.deleteConfession(req, res);
    assert('DELETE existing returns 200 {msg: "ok", item: {...}}', res.statusCode === 200 && res.body.msg === 'ok' && res.body.item.id === 1, res.body, 'ok deletion');
  }

  // Test 17: Verify remaining item count
  {
    const req = {};
    const res = createMockRes();
    confessionController.getAllConfessions(req, res);
    assert('GET all after deletion returns count 1', res.statusCode === 200 && res.body.count === 1 && res.body.data[0].id === 2, res.body.count, 1);
  }

  console.log(`\n--- Test Summary: ${passed} Passed, ${failed} Failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
