import { test } from "node:test";
import assert from "node:assert/strict";
import { bountyPayHref, githubConfigured, xConfigured, BOUNTY_REDIRECT } from "./demigod-bounty-auth.mjs";

const SOL = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const sampleSol = "So11111111111111111111111111111111111111112";

test("solana pay URL uses USDC mint", () => {
  const href = bountyPayHref({ amount: 25, payTo: sampleSol });
  assert.equal(href, "solana:" + sampleSol + "?amount=25&spl-token=" + SOL);
});

test("empty payTo does not invent an address", () => {
  assert.equal(bountyPayHref({ amount: 25, payTo: "" }), "");
  assert.equal(bountyPayHref({ amount: 25 }), "");
});

test("base chain uses Base USDC mint", () => {
  const evm = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const href = bountyPayHref({ amount: 25, payTo: evm, chain: "base" });
  assert.ok(href.startsWith("ethereum:" + BASE + "@8453/transfer?"));
  assert.ok(href.includes("address=" + encodeURIComponent(evm)));
  assert.ok(href.includes("uint256=25000000"));
});

test("github never reports configured without secrets", () => {
  assert.equal(githubConfigured({ githubClientId: "", githubClientSecret: "" }), false);
  assert.equal(githubConfigured({ githubClientId: "abc", githubClientSecret: "" }), false);
  assert.equal(githubConfigured({ githubClientId: "abc", githubClientSecret: "def" }), true);
});

test("x hidden unless both client id and secret exist", () => {
  assert.equal(xConfigured({ xClientId: "x" }), false);
  assert.equal(xConfigured({ xClientId: "", xClientSecret: "y" }), false);
});

test("x stays optional", () => {
  assert.equal(xConfigured({}), false);
  assert.equal(xConfigured({ xClientId: "x", xClientSecret: "y" }), true);
});

test("redirect is the live bounty page", () => {
  assert.equal(BOUNTY_REDIRECT, "https://www.trydemigod.com/?p=bounties");
});
