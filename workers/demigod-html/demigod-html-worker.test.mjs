#!/usr/bin/env node
/**
 * Motley home IA + demigod-html integrity.
 * Run: node --test workers/demigod-html/demigod-html-worker.test.mjs
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  applyMotleyHeroDepth,
  applyMotleyHomeIa,
  BRIEF_HREF,
  DESK_HREF,
  DESK_HEALTHZ,
  iaFooterHtml,
  MOTLEY_HERO_DEPTH_CSS,
  motleyHomeIaHtml,
  NETWORK_HREF,
} from "./demigod-home-ia.js";
import workerModule, {
  demigodHomeHtml,
  injectBountiesBoard,
  leftoverRedirectPath,
  rewriteCdnPin,
  rewriteDeadConversionCtas,
} from "./demigod-html-worker.js";

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
    assert.equal((once.match(/id="hero-depth"/g) || []).length, 1);
    assert.equal((twice.match(/id="hero-depth"/g) || []).length, 1);
    assert.equal((once.match(/id="hero-path"/g) || []).length, 1);
    assert.equal((twice.match(/id="hero-path"/g) || []).length, 1);
  });

  it("paints Motley cinematic hero depth without purple-wash or WebGL", () => {
    const html = home();
    assert.match(MOTLEY_HERO_DEPTH_CSS, /\.hero-vignette\{/);
    assert.match(MOTLEY_HERO_DEPTH_CSS, /\.hero-focal\{/);
    assert.match(MOTLEY_HERO_DEPTH_CSS, /@keyframes hero-focal-float/);
    assert.match(MOTLEY_HERO_DEPTH_CSS, /\.hero-cta-card\{/);
    assert.match(MOTLEY_HERO_DEPTH_CSS, /\.hero-punch\{/);
    assert.match(MOTLEY_HERO_DEPTH_CSS, /prefers-reduced-motion:reduce/);
    assert.match(MOTLEY_HERO_DEPTH_CSS, /\.hero-focal\{animation:none\}/);
    assert.doesNotMatch(MOTLEY_HERO_DEPTH_CSS, /#482bd9|Nantes|three\.js|WebGL|webgl/i);
    assert.match(html, /id="hero-depth"/);
    assert.match(html, /class="hero-vignette"/);
    assert.match(html, /class="hero-focal"/);
    assert.match(html, /hero-focal-core/);
    assert.match(html, /@keyframes hero-focal-float/);
    assert.match(html, /id="hero-cta-card"/);
    assert.match(html, /class="hero-punch"/);
    assert.match(html, /id="hero-path"/);
    assert.match(html, /hero-path-n">01/);
    assert.match(html, /hero-path-n">02/);
    assert.match(html, /hero-path-n">03/);
    assert.match(html, /hero-path-n">04/);
    assert.match(html, /href="\/\?wiz=startup">Brief</);
    assert.match(html, /href="\/room">Room</);
    assert.match(html, /href="#how">Meet</);
    assert.match(html, /A motley crew is assembled quietly/);
    assert.match(html, /id="cta-ladder"/);
    assert.doesNotMatch(html, /hamburger|nav-overlay|menu-toggle/i);
    assert.doesNotMatch(html, /plugin\.jup\.ag/);
    assert.doesNotMatch(html, /#482bd9/i);
    assert.doesNotMatch(html, /three\.js|WebGLRenderer|webgl/i);
    assert.doesNotMatch(html, /\+N teams|\+\d+ teams/i);
    assert.doesNotMatch(html, /getdasha\.com\/compute/);
    const again = applyMotleyHeroDepth(html);
    assert.equal((again.match(/class="hero-vignette"/g) || []).length, 1);
    assert.equal((again.match(/id="hero-cta-card"/g) || []).length, 1);
  });

  it("cuts lede/how/for-whom essays to punch lines", () => {
    const html = home();
    assert.match(html, /class="lede">You're deciding who's in the boat\. A person picks, then knocks once\./);
    assert.match(html, /step-t">Say it once</);
    assert.match(html, /step-b">One brief\. The actual work\./);
    assert.match(html, /step-b">Mutual yes\. Nothing moves until you do\./);
    assert.match(html, /walk-t">Brief</);
    assert.match(html, /walk-t">Read</);
    assert.match(html, /walk-t">Yes</);
    assert.match(html, /walk-t">Meet</);
    assert.match(html, /triad-b">One role\. A person reads it\./);
    assert.match(html, /method-b">Both sides\. That role\./);
    assert.match(html, /faq-a">After mutual yes\. Per match, not a list\./);
    const lede = (html.match(/<p class="lede">([\s\S]*?)<\/p>/) || [])[1] || "";
    const ledeWords = lede.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
    assert.ok(ledeWords <= 14, `lede should be punchy, got ${ledeWords} words`);
    assert.doesNotMatch(html, /You're not filling a seat/);
    assert.doesNotMatch(html, /first five people decide what the company becomes/);
    assert.doesNotMatch(html, /send names into the world automatically/);
    assert.doesNotMatch(html, /There is no fit rank/);
    assert.doesNotMatch(html, /We didn't want a pipeline/);
    assert.doesNotMatch(html, /both sides have already said yes/i);
    assert.doesNotMatch(html, /class="check-body"/);
    assert.doesNotMatch(html, /Learn more/);
    assert.doesNotMatch(html, /triad-more/);
    assert.doesNotMatch(html, /#482bd9/i);
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
      assert.match(html, /id="hero-depth"/);
      assert.match(html, /id="hero-cta-card"/);
      assert.match(html, /id="hero-path"/);
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

describe("leftover openings + pricing conversion CTAs", () => {
  it('maps leftoverRedirectPath("/openings") to home', () => {
    assert.equal(leftoverRedirectPath("/openings"), "/");
    assert.equal(leftoverRedirectPath("/openings/"), "/");
    assert.equal(leftoverRedirectPath("/jobs"), "/");
  });

  it('maps leftoverRedirectPath("/start") to hire-home /', () => {
    assert.equal(leftoverRedirectPath("/start"), "/");
    assert.equal(leftoverRedirectPath("/start/"), "/");
    assert.equal(leftoverRedirectPath("/Start"), "/");
    assert.equal(leftoverRedirectPath("/compute"), "");
  });

  it("GET /openings leftover-redirects to /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/openings"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /start leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/start"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it('maps leftoverRedirectPath("/briefs") to hire-home /', () => {
    assert.equal(leftoverRedirectPath("/briefs"), "/");
    assert.equal(leftoverRedirectPath("/briefs/"), "/");
    assert.equal(leftoverRedirectPath("/Briefs"), "/");
    assert.equal(leftoverRedirectPath("/compute"), "");
  });

  it("GET /briefs leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/briefs"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /briefs/ leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/briefs/"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it('maps leftoverRedirectPath("/recruit") to hire-home /', () => {
    assert.equal(leftoverRedirectPath("/recruit"), "/");
    assert.equal(leftoverRedirectPath("/recruit/"), "/");
    assert.equal(leftoverRedirectPath("/Recruit"), "/");
    assert.equal(leftoverRedirectPath("/compute"), "");
  });

  it("GET /recruit leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/recruit"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /recruit/ leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/recruit/"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it('maps leftoverRedirectPath("/recruit-family") to hire-home /', () => {
    assert.equal(leftoverRedirectPath("/recruit-family"), "/");
    assert.equal(leftoverRedirectPath("/recruit-family/"), "/");
    assert.equal(leftoverRedirectPath("/Recruit-Family"), "/");
    assert.equal(leftoverRedirectPath("/compute"), "");
  });

  it("GET /recruit-family leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/recruit-family"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /recruit-family/ leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/recruit-family/"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /Recruit-Family leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/Recruit-Family"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it('maps leftoverRedirectPath("/motley") to hire-home /', () => {
    assert.equal(leftoverRedirectPath("/motley"), "/");
    assert.equal(leftoverRedirectPath("/motley/"), "/");
    assert.equal(leftoverRedirectPath("/Motley"), "/");
    assert.equal(leftoverRedirectPath("/compute"), "");
    assert.equal(leftoverRedirectPath("/directory"), "");
  });

  it("GET /motley leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/motley"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /motley/ leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/motley/"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("HEAD /motley leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/motley", { method: "HEAD" }), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /Motley leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/Motley"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it('maps leftoverRedirectPath("/founder") to hire-home /', () => {
    assert.equal(leftoverRedirectPath("/founder"), "/");
    assert.equal(leftoverRedirectPath("/founder/"), "/");
    assert.equal(leftoverRedirectPath("/Founder"), "/");
    assert.equal(leftoverRedirectPath("/founders"), "/");
    assert.equal(leftoverRedirectPath("/compute"), "");
    assert.equal(leftoverRedirectPath("/directory"), "");
  });

  it("GET /founder leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/founder"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /founder/ leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/founder/"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("HEAD /founder leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/founder", { method: "HEAD" }), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /Founder leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/Founder"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it('maps leftoverRedirectPath("/intro") to hire-home /', () => {
    assert.equal(leftoverRedirectPath("/intro"), "/");
    assert.equal(leftoverRedirectPath("/intro/"), "/");
    assert.equal(leftoverRedirectPath("/Intro"), "/");
    assert.equal(leftoverRedirectPath("/intros"), "/");
    assert.equal(leftoverRedirectPath("/match"), "/");
    assert.equal(leftoverRedirectPath("/compute"), "");
  });

  it("GET /intro leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/intro"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /intro/ leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/intro/"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("HEAD /intro leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/intro", { method: "HEAD" }), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /Intro leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/Intro"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it('maps leftoverRedirectPath("/signup") to /app/login', () => {
    assert.equal(leftoverRedirectPath("/signup"), "/app/login");
    assert.equal(leftoverRedirectPath("/signup/"), "/app/login");
    assert.equal(leftoverRedirectPath("/Signup"), "/app/login");
    assert.equal(leftoverRedirectPath("/login"), "/app/login");
    assert.equal(leftoverRedirectPath("/compute"), "");
    assert.equal(leftoverRedirectPath("/directory"), "");
  });

  it("GET /signup leftover-redirects to /app/login", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/signup"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/app/login");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /signup/ leftover-redirects to /app/login", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/signup/"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/app/login");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("HEAD /signup leftover-redirects to /app/login", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/signup", { method: "HEAD" }), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/app/login");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /Signup leftover-redirects to /app/login", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/Signup"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/app/login");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it('maps leftoverRedirectPath("/hire-me") to hire-home /', () => {
    assert.equal(leftoverRedirectPath("/hire-me"), "/");
    assert.equal(leftoverRedirectPath("/hire-me/"), "/");
    assert.equal(leftoverRedirectPath("/Hire-Me"), "/");
    assert.equal(leftoverRedirectPath("/compute"), "");
  });

  it("GET /hire-me leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/hire-me"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /hire-me/ leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/hire-me/"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it('maps leftoverRedirectPath("/die") to hire-home /', () => {
    assert.equal(leftoverRedirectPath("/die"), "/");
    assert.equal(leftoverRedirectPath("/die/"), "/");
    assert.equal(leftoverRedirectPath("/Die"), "/");
    assert.equal(leftoverRedirectPath("/compute"), "");
  });

  it("GET /die leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/die"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("GET /die/ leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/die/"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  const hireAtsLeftovers = [
    "/recruiter",
    "/hiring",
    "/talent-pool",
    "/ats",
    "/greenhouse",
    "/ashby",
    "/lever",
    "/intros",
    "/match",
    "/matching",
    "/operators",
    "/operator",
  ];

  for (const path of hireAtsLeftovers) {
    const titled = path.replace(/[a-z]+/g, (part) => part[0].toUpperCase() + part.slice(1));
    it(`maps leftoverRedirectPath("${path}") to hire-home /`, () => {
      assert.equal(leftoverRedirectPath(path), "/");
      assert.equal(leftoverRedirectPath(`${path}/`), "/");
      assert.equal(leftoverRedirectPath(titled), "/");
      assert.equal(leftoverRedirectPath("/compute"), "");
    });

    it(`GET ${path} leftover-redirects to hire-home /`, async () => {
      const res = await workerModule.fetch(new Request(`https://www.trydemigod.com${path}`), {});
      assert.equal(res.status, 308);
      assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
      assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
    });
  }

  it("GET /hiring/ leftover-redirects to hire-home /", async () => {
    const res = await workerModule.fetch(new Request("https://www.trydemigod.com/hiring/"), {});
    assert.equal(res.status, 308);
    assert.equal(res.headers.get("location"), "https://www.trydemigod.com/");
    assert.equal(res.headers.get("x-demigod-edge"), "leftover-redirect");
  });

  it("does not invent parked product leftover aliases", () => {
    assert.equal(leftoverRedirectPath("/compute"), "");
    assert.equal(leftoverRedirectPath("/studio"), "");
    assert.equal(leftoverRedirectPath("/verse"), "");
    assert.equal(leftoverRedirectPath("/learn"), "");
    assert.equal(leftoverRedirectPath("/graph"), "");
    assert.equal(leftoverRedirectPath("/dasha"), "");
    assert.equal(leftoverRedirectPath("/directory"), "");
  });

  it("rewrites dead pricing Get started / Contact / footer Pricing", () => {
    const src = [
      '<a href="/?wiz=startup" class="button on-inverse w-inline-block"><div class="button_label">Start a brief</div></a>',
      '<div class="ix-link-wrapper flex_vertical"><a href="#" class="button is-secondary on-inverse w-inline-block"><div>Get started</div></a></div>',
      '<a href="#" class="button is-small on-inverse w-button">Get started</a>',
      '<a href="#" class="button w-button">Contact</a>',
      '<a href="#" class="nav_dropdown-link w-inline-block"><div class="button_label">Contact support</div></a>',
      '<a href="#" class="footer_link on-inverse w-inline-block"><div>Pricing</div></a>',
      '<a href="#" class="nav_link on-inverse w-inline-block"><div>About</div></a>',
      '<a href="#" class="footer_link on-inverse w-inline-block"><div>Blog</div></a>',
    ].join("");
    const html = rewriteDeadConversionCtas(src);
    assert.doesNotMatch(html, /<a\b[^>]*href=["']#["'][^>]*>[\s\S]*?Get started[\s\S]*?<\/a>/i);
    assert.match(html, /href="\/\?wiz=startup" class="button is-secondary on-inverse w-inline-block"><div>Get started<\/div>/);
    assert.match(html, /href="\/\?wiz=startup" class="button is-small on-inverse w-button">Get started/);
    assert.match(html, /href="\/contact" class="button w-button">Contact</);
    assert.match(html, /href="\/contact" class="nav_dropdown-link[\s\S]*button_label">Contact support/);
    assert.match(html, /href="\/pricing" class="footer_link[\s\S]*<div>Pricing<\/div>/);
    assert.match(html, /href="#" class="nav_link on-inverse w-inline-block"><div>About<\/div>/);
    assert.match(html, /href="#" class="footer_link on-inverse w-inline-block"><div>Blog<\/div>/);
    assert.match(html, /href="\/\?wiz=startup" class="button on-inverse w-inline-block"><div class="button_label">Start a brief<\/div>/);
  });
});
