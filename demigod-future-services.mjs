#!/usr/bin/env node
/**
 * Demigod Future Services Stub (Twilio, Stripe, Microsoft for Startups / Azure).
 *
 * Current reality (pre-services, 2026-07): NONE of these are live.
 * - Twilio: SMS is manual/sim only. Use PENDING_NUMBER.
 * - Stripe: 10% fee is manual invoice / hello@ follow-up. No checkout.
 * - Stripe Atlas: Not used (no entity setup automation).
 * - Microsoft for Startups / Azure credits: Not claimed/used. Tools run locally or on existing infra.
 *
 * Purpose:
 * - Single place for status + stubs.
 * - Plan integrations here (modular).
 * - All live code must respect isEnabled() === false for now.
 * - When services arrive: flip flags, implement real adapters, remove pending language gradually.
 *
 * Usage:
 *   import { getServiceStatus, sendSmsStub, createInvoiceStub } from './demigod-future-services.mjs';
 *
 * Rules (per AGENTS.md + pre-services honesty):
 * - Always surface "pending" to users/founders.
 * - No promises of automation.
 * - Board/pilots/receipts stay honest (real only).
 */

export const FUTURE_SERVICES = {
  twilio: {
    enabled: false,
    liveNumber: null,           // e.g. real Twilio number when provisioned
    pendingNumber: '+1 (415) 555-DEMO',
    webhookUrl: 'https://...loca.lt/sms', // or real
    notes: 'Multi-turn SMS onboarding + 90d follow-ups. Currently via sms-sim + manual.'
  },
  stripe: {
    enabled: false,
    account: null,
    atlas: false,
    feePercent: 10,
    notes: '10% on first-year comp only on successful hire. Manual invoicing now. Stripe Atlas for future company ops if scaling.'
  },
  microsoftForStartups: {
    enabled: false,
    azureCredits: false,
    notes: 'Potential for hosting matching-engine, analytics, preview matcher, or CI. Claim when eligible.'
  }
};

export function getServiceStatus(service) {
  if (!service) return FUTURE_SERVICES;
  return FUTURE_SERVICES[service] || { enabled: false, notes: 'unknown' };
}

export function isServiceEnabled(service) {
  return !!getServiceStatus(service).enabled;
}

/** Stub for sending SMS. Logs + returns pending message. Replace with real Twilio client later. */
export function sendSmsStub({ to, body, from = null }) {
  const status = getServiceStatus('twilio');
  const actualFrom = from || status.pendingNumber;
  console.log(`[FUTURE-SERVICES] SMS STUB (Twilio ${status.enabled ? 'LIVE' : 'PENDING'}): from ${actualFrom} to ${to}`);
  console.log(`  body: ${body}`);
  if (!status.enabled) {
    console.log('  (pending: would be real Twilio send + webhook when provisioned)');
  }
  // In future: real twilio.messages.create(...)
  return { sent: false, pending: true, simulated: true, from: actualFrom };
}

/** Stub for invoice / payment. Manual for now. */
export function createInvoiceStub({ pilotId, amount, description, toEmail }) {
  const status = getServiceStatus('stripe');
  console.log(`[FUTURE-SERVICES] INVOICE STUB (Stripe ${status.enabled ? 'LIVE' : 'PENDING'}):`);
  console.log(`  pilot: ${pilotId}, amount: ${amount || '10% first year'}, to: ${toEmail}`);
  console.log(`  desc: ${description}`);
  if (!status.enabled) {
    console.log('  (pending: manual hello@ invoice. Stripe + Atlas when ready)');
  }
  // Future: stripe.invoices.create + send
  return { created: false, pending: true, manual: true };
}

/** Trigger 10% on successful hire (after receipted). Research: 10-25% first-yr common, payable post-start/90d guarantee. Pending Stripe. */
export function onHireInvoice(pilot) {
  // When: after pilot close with hire outcome, or receipt.
  // 10% first year. Research: 10-25% first-yr common, post start/90d guarantee. Pending.
  return createInvoiceStub({pilotId: pilot.id, amount: "10% " + (pilot.comp || "first year"), toEmail: pilot.founder || "hello@"});
}

/** Future Azure / hosting stub. */
export function getAzureConfigStub() {
  const status = getServiceStatus('microsoftForStartups');
  return {
    enabled: status.enabled,
    creditsAvailable: status.azureCredits,
    suggestedUses: ['matching-engine as API', 'proof visualizer hosting', 'analytics for pilots'],
    notes: status.notes
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Demigod Future Services Status');
  console.dir(getServiceStatus(), { depth: 2 });
  console.log('\nTwilio stub test:');
  sendSmsStub({ to: '+14155550123', body: 'test onboard from future-services stub' });
}
