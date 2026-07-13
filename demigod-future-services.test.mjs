#!/usr/bin/env node
/**
 * Simple test harness for demigod-future-services.mjs
 * Run: node demigod-future-services.test.mjs
 * Part of internal tests for future infra (pre-services honesty).
 * Integrates with verify flow.
 */

import {
  FUTURE_SERVICES,
  getServiceStatus,
  isServiceEnabled,
  sendSmsStub,
  createInvoiceStub,
  getAzureConfigStub
} from './demigod-future-services.mjs';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('✓', msg);
  } else {
    failed++;
    console.error('✗', msg);
  }
}

console.log('=== Demigod Future Services Test ===\n');

// All services start disabled (honest pre-services)
assert(!isServiceEnabled('twilio'), 'twilio disabled');
assert(!isServiceEnabled('stripe'), 'stripe disabled');
assert(!isServiceEnabled('microsoftForStartups'), 'microsoft disabled');

// Status returns structure
const all = getServiceStatus();
assert(all.twilio && all.twilio.enabled === false, 'getServiceStatus returns full with disabled');
assert(getServiceStatus('twilio').pendingNumber.includes('DEMO'), 'pending number present');

// Stubs always return pending/sim
const sms = sendSmsStub({ to: '+14155550123', body: 'test' });
assert(sms.pending === true && sms.simulated === true, 'sendSmsStub returns pending/simulated');

const inv = createInvoiceStub({ pilotId: 'test', amount: '10%', toEmail: 'test@example.com' });
assert(inv.pending === true && inv.manual === true, 'createInvoiceStub returns pending/manual');

const azure = getAzureConfigStub();
assert(azure.enabled === false && Array.isArray(azure.suggestedUses), 'getAzureConfigStub returns disabled + uses');

// FUTURE_SERVICES is the source of truth
assert(FUTURE_SERVICES.twilio.enabled === false, 'FUTURE_SERVICES source has disabled');

// No real sends happen
assert(!isServiceEnabled('twilio'), 'no live send possible');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('Future services test FAILED');
  process.exit(1);
} else {
  console.log('Future services test PASSED (all pending as expected)');
  process.exit(0);
}
