/**
 * Demigod Submission Triage (simple rule-based)
 * Takes submission data (from forms or intake), scores for human review.
 * High leverage: speeds triage for honest matches, suggests intros.
 * Rules: stage overlap, skills keyword match (simple), completeness.
 * Outputs ranked + suggestions. Uses board data.
 * Perfect fit: augments human (no auto-match), pre-services sim ok.
 * Run: node demigod-submission-triage.mjs --data '{"type":"cand","skills":"React Figma","stage":"seed"}'
 */
import fs from 'fs';
import { readFileSync } from 'fs';

const board = JSON.parse(readFileSync('DEMIGOD-BOARD.json', 'utf8') || '{"roles":[],"candidates":[]}');

function score(sub) {
  let s = 0;
  const skills = (sub.skills || '').toLowerCase().split(/[, ]+/);
  const stage = (sub.stage || '').toLowerCase();
  // Stage overlap
  board.roles.forEach(r => {
    if (r.stageType && r.stageType.toLowerCase().includes(stage)) s += 20;
    const rskills = (r.skills || '').toLowerCase();
    skills.forEach(sk => { if (rskills.includes(sk)) s += 10; });
  });
  // Completeness
  if (sub.email && sub.details) s += 15;
  return Math.min(100, s);
}

function suggest(sub) {
  const matches = board.roles.filter(r => {
    const rskills = (r.skills || '').toLowerCase();
    return (sub.skills || '').toLowerCase().split(/[, ]+/).some(sk => rskills.includes(sk));
  }).slice(0,3);
  return matches.map(m => `Intro to ${m.title} at ${m.stageType}`);
}

const args = process.argv.slice(2);
let data = {};
if (args[0] === '--data') data = JSON.parse(args[1]);
else data = {type: 'cand', skills: 'React,PM', stage: 'seed', email: 'test@ex.com', details: 'shipped v1'};

const sc = score(data);
const sugg = suggest(data);
console.log('TRIAGE SCORE:', sc);
console.log('SUGGESTED:', sugg);
console.log('For human review. Honest: no auto decision.');
// In real: append to pilot or log for review.
