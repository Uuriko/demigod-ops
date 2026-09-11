#!/usr/bin/env node
/**
 * Motley home IA + demigod-html integrity.
 * Run: node --test workers/demigod-html/demigod-html-worker.test.mjs
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  applyMotleyHomeIa,
  BRIEF_HREF,
  DESK_HREF,
  DESK_HEALTHZ,
  iaFooterHtml,
  motleyHomeIaHtml,
  NETWORK_HREF,
} from "./demigod-home-ia.js";
import workerModule, { demigodHomeHtml, injectBountiesBoard, rewriteCdnPin } from "./demigod-html-worker.js";

const root = new URL("./", import.meta.url);
const workerSrc = await readFile(new URL("./demigod-html-worker.js", root), "utf8");
const iaSrc = await readFile(new URL("./demigod-home-ia.js", root), "utf8");
const wrangler = await readFile(new URL("./wrangler.jsonc", root), "utf8");

function home() {
  return demigodHomeHtml(null);
}

describe("demigod-html wrangler + integrity", () => {
  it("owns www.trydemigod.com and does not deploy getdasha", () => {
    assert.match(wrangler, /"name": "demigod-html"/);
    assert.match(wrangler, /"pattern": "www\.trydemigod\.com\/\*"/);
    assert.match(wrangler, /"main": "demigod-html-worker\.js"/);
    assert.doesNotMatch(wrangler, /getdasha\.com/);
  });

  it("keeps blank Start a brief, SIWG, CDN pin, room door, bounties", () => {
    assert.match(workerSrc, /const briefHref = "\/\?wiz=startup"/);
    assert.doesNotMatch(workerSrc, /const briefHref = namedBriefHref/);
    assert.match(workerSrc, /Sign in with Grok Bot/);
    assert.match(workerSrc, /function rewriteCdnPin/);
    assert.match(workerSrc, /demigod-site-cdn@a1a851ac48e9/);
    assert.doesNotMatch(workerSrc, /b22473c0bd8f/);
    assert.match(workerSrc, /function roomEntry/);
    assert.match(workerSrc, /project-room-staging\.getdasha\.workers\.dev/);
    assert.match(workerSrc, /Agents sit as Members/);
    assert.match(workerSrc, /getdasha\.com\/compute/);
    assert.doesNotMatch(workerSrc, /shared space to talk/i);
    assert.match(workerSrc, /demigod-bounties-feed\/v1/);
    assert.equal(typeof rewriteCdnPin, "function");
    assert.equal(typeof injectBountiesBoard, "function");
  });

  it("does not clone the reference brand", () => {
    const html = home();
    assert.doesNotMatch(html, /#482bd9/i);
    assert.doesNotMatch(html, /Nantes/i);
    assert.doesNotMatch(iaSrc, /#482bd9/i);
    assert.doesNotMatch(iaSrc, /Nantes/i);
    assert.doesNotMatch(workerSrc, /#482bd9/i);
    assert.doesNotMatch(workerSrc, /Nantes/i);
  });
});

describe("Motley home IA", () => {
  it("renders triad, use-cases, desk door, FAQ, footer from the builder", () => {
    const html = motleyHomeIaHtml(BRIEF_HREF);
    assert.match(html, /id="for-whom"/);
    assert.match(html, /FOUNDERS/);
    assert.match(html, /TALENT/);
    assert.match(html, /OPERATORS/);
    assert.match(html, /Start a brief/);
    assert.match(html, /Join the network/);
    assert.match(html, /id="work"/);
    assert.match(html, /Seed first seats/);
    assert.match(html, /Series A eng seats/);
    assert.match(html, /Weekly movers snapshot/);
    assert.match(html, /Company intelligence desk/);
    assert.match(html, /id="desk"/);
    assert.match(html, /Motley map/);
    assert.match(html, /hosted, read-only/);
    assert.match(html, /id="method"/);
    assert.match(html, /How a match is made/);
    assert.match(html, /THE BRIEF/);
    assert.match(html, /THE YES/);
    assert.match(html, /id="walk"/);
    assert.match(html, /Brief to match/);
    assert.match(html, /id="faq"/);
    assert.match(html, /href="#faq-brief"/);
    assert.match(html, /href="#faq-consent"/);
    assert.match(html, /href="#faq-weekly"/);
    assert.match(html, /href="#faq-desk"/);
    assert.doesNotMatch(html, /Ashby|Greenhouse|Lever|people-data|ATS spam|placed \d+|hired \d+/i);
    assert.match(html, /app\.trydemigod\.com/);
  });

  it("splices IA into Motley home HTML", () => {
    const html = home();
    assert.match(html, /A motley crew is assembled quietly/);
    assert.match(html, /id="brief"/);
    assert.match(html, /id="cta-ladder"/);
    assert.match(html, /How it goes/);
    assert.match(html, /Explore the map/);
    assert.match(html, /id="method"/);
    assert.match(html, /id="walk"/);
    assert.match(html, /href="\/\?wiz=startup"/);
    assert.match(html, /id="for-whom"/);
    assert.match(html, /id="work"/);
    assert.match(html, /id="desk"/);
    assert.match(html, /id="faq"/);
    assert.match(html, /id="how"/);
    assert.match(html, /id="how-cta"/);
    assert.match(html, /Sign in with Grok Bot/);
    assert.match(html, /ia-foot/);
    assert.match(html, />Platform</);
    assert.match(html, />Resources</);
    assert.match(html, />Desk</);
    assert.match(html, />Network</);
    assert.match(html, /app\.trydemigod\.com/);
    assert.match(html, /\/healthz/);
    assert.match(html, /Join the network/);
    assert.doesNotMatch(html, /#482bd9/i);
    assert.doesNotMatch(html, /Nantes/i);
    assert.doesNotMatch(html, /yc:array-labs/);
    const briefs = html.match(/href="\/\?wiz=startup"/g) || [];
    assert.ok(briefs.length >= 4, `Start a brief should repeat, got ${briefs.length}`);
  });

  it("is idempotent", () => {
    const once = home();
    const twice = applyMotleyHomeIa(once);
    assert.equal((once.match(/id="for-whom"/g) || []).length, 1);
    assert.equal((twice.match(/id="for-whom"/g) || []).length, 1);
  });

  it("footer uses existing URLs only", () => {
    const foot = iaFooterHtml();
    assert.match(foot, /href="\/"/);
    assert.match(foot, /href="\/companies"/);
    assert.match(foot, /href="\/weekly"/);
    assert.match(foot, /href="\/packets"/);
    assert.match(foot, /href="\/contact"/);
    assert.match(foot, /href="\/legal"/);
    assert.match(foot, /href="\/room"/);
    assert.match(foot, /href="\/app"/);
    assert.match(foot, new RegExp(`href="${DESK_HREF.replace(/[./]/g, "\\$&")}"`));
    assert.match(foot, new RegExp(`href="${DESK_HEALTHZ.replace(/[./]/g, "\\$&")}"`));
    assert.match(foot, new RegExp(`href="${NETWORK_HREF.replace(/[?]/g, "\\$&")}"`));
    assert.match(foot, /mailto:potter@trydemigod\.com/);
  });
});

describe("demigod-html fetch home-motley", () => {
  it("GET / returns Motley home with IA and blank brief", async () => {
    const nativeFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        throw new Error("cdn offline");
      };
      const res = await workerModule.fetch(new Request("https://www.trydemigod.com/"), {});
      const html = await res.text();
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("x-demigod-edge"), "home-motley");
      assert.match(html, /id="for-whom"/);
      assert.match(html, /id="cta-ladder"/);
      assert.match(html, /id="method"/);
      assert.match(html, /id="work"/);
      assert.match(html, /Start a brief/);
      assert.match(html, /href="\/\?wiz=startup"/);
      assert.doesNotMatch(html, /namedBriefHref/);
      assert.doesNotMatch(html, /#482bd9/i);
    } finally {
      globalThis.fetch = nativeFetch;
    }
  });

  it("GET /room keeps the project-room door", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/room"), {});
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.match(html, /Project Room/);
    assert.match(html, /project-room-staging\.getdasha\.workers\.dev/);
    assert.match(html, /Work Items/);
    assert.match(html, /next actions/);
    assert.match(html, /receipts/);
    assert.match(html, /Agents sit as Members/);
    assert.match(html, /getdasha\.com\/compute/);
    assert.match(html, /run factory/);
    assert.doesNotMatch(html, /shared space to talk/i);
    assert.doesNotMatch(html, /Workers AI|Ollama|prompt/i);
    const opens = html.match(/href="https:\/\/project-room-staging\.getdasha\.workers\.dev"/g) || [];
    assert.equal(opens.length, 1);
  });

  it("GET /project-room is the same Motley door", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/project-room"), {});
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.match(html, /Agents sit as Members/);
    assert.match(html, /project-room-staging\.getdasha\.workers\.dev/);
  });
});
