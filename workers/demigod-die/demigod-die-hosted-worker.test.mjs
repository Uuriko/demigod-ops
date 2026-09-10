#!/usr/bin/env node
/**
 * Hosted DIE desk Worker — H2 / H2.1 gates.
 * Run: node --test workers/demigod-die/demigod-die-hosted-worker.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleRequest } from "./demigod-die-hosted-worker.js";

const ORIGIN = "https://app.trydemigod.com";

function shapeJwt() {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: "shape-only" })).toString("base64url");
  return `${header}.${payload}.sig`;
}

async function call(path, { method = "GET", headers = {} } = {}) {
  return handleRequest(new Request(`${ORIGIN}${path}`, { method, headers }));
}

async function textOf(res) {
  return res.text();
}

describe("demigod-die hosted worker", () => {
  it("GET /healthz without JWT is 200 and carries no OpenAI or cand- bytes", async () => {
    const res = await call("/healthz");
    const body = await textOf(res);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-demigod-die"), "hosted-read-only");
    assert.match(body, /"ok":true/);
    assert.match(body, /hosted-read-only-h2\.1/);
    assert.doesNotMatch(body, /OpenAI/i);
    assert.doesNotMatch(body, /cand-/i);
    const json = JSON.parse(body);
    assert.equal(json.service, "demigod-die");
    assert.equal(Object.keys(json).sort().join(","), "ok,release,service");
  });

  it("GET /roles without JWT is 403", async () => {
    const res = await call("/roles");
    const body = await textOf(res);
    assert.equal(res.status, 403);
    assert.equal(res.headers.get("x-demigod-die"), "hosted-read-only");
    assert.equal(JSON.parse(body).error, "access_required");
  });

  it("POST is 405", async () => {
    const res = await call("/roles", { method: "POST" });
    const body = await textOf(res);
    assert.equal(res.status, 405);
    assert.equal(res.headers.get("allow"), "GET, HEAD");
    assert.equal(JSON.parse(body).error, "method_not_allowed");
  });

  it("people path is 404 (no people-data route)", async () => {
    const headers = { "Cf-Access-Jwt-Assertion": shapeJwt() };
    const res = await call("/people", { headers });
    const body = await textOf(res);
    assert.equal(res.status, 404);
    assert.equal(JSON.parse(body).error, "not_found");
    assert.doesNotMatch(body, /cand-/i);
  });
});
