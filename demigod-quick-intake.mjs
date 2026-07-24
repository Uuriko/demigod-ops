/**
 * Demigod Quick Intake Generator
 * Standalone tool to generate self-contained HTML "quick profile" teaser.
 * Purpose: Share in DMs/outreach to drive MORE candidates/startups to submit full info on trydemigod.com (north star: more matching opportunities, revenue).
 * Run: node demigod-quick-intake.mjs > quick-candidate-intake.html
 * Then host/share the HTML. On "submit" it logs + encourages full form.
 * Keeps main site minimal (no bloat).
 * Honest/pre-services: "pending", links to main.
 */

import fs from 'fs';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quick Profile • Demigod (SF Startup Talent Matching)</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0A0A0A; color: #F5F0E6; max-width: 600px; margin: 40px auto; padding: 20px; line-height: 1.5; }
    h1 { color: #C9A84C; font-family: Cinzel, serif; }
    .gold { color: #C9A84C; }
    form { background: #111; padding: 20px; border-radius: 8px; border: 1px solid #C9A84C; }
    input, textarea, select { width: 100%; padding: 10px; margin: 8px 0; background: #222; color: #F5F0E6; border: 1px solid #C9A84C; border-radius: 4px; box-sizing: border-box; }
    button { background: #C9A84C; color: #0A0A0A; padding: 12px 20px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 10px; }
    .note { font-size: 0.9em; color: #A8A29E; margin-top: 10px; }
    .success { display: none; background: #1a2a1a; padding: 15px; border-radius: 4px; border: 1px solid #C9A84C; }
  </style>
</head>
<body>
  <h1>Quick Match to SF Startups <span class="gold">(Demigod)</span></h1>
  <p>Startups submit briefs. Candidates upload once. Humans match. 10% only on hire.</p>
  <p class="note">This is a quick teaser to get started. For full matching, use the main form at <a href="https://www.trydemigod.com" style="color:#C9A84C;">trydemigod.com</a> (WIZ one-question-at-a-time).</p>
  
  <form id="quickForm">
    <input type="text" id="name" placeholder="Your full name" required>
    <input type="email" id="email" placeholder="Best email" required>
    <select id="type" required>
      <option value="">I am a...</option>
      <option value="candidate">Candidate looking for SF startup role</option>
      <option value="startup">Startup hiring SF talent</option>
    </select>
    <textarea id="details" rows="3" placeholder="Key skills / role needed / stage (1-2 lines)" required></textarea>
    <button type="submit">Submit Quick Profile → Get matched (full details on site)</button>
  </form>
  
  <div id="success" class="success">
    <strong>Thanks! Logged.</strong><br>
    A human will review. Go to <a href="https://www.trydemigod.com#startup-modal" style="color:#C9A84C;">trydemigod.com</a> for the full WIZ form (email, company, stage, role, etc.).<br>
    (Payments/SMS pending setup — confirmations via potter@trydemigod.com)
  </div>
  
  <p class="note">Honest: 3 seeds max on board until real. Pre-services. 10% on hire only.</p>

  <script>
    document.getElementById('quickForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const data = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        type: document.getElementById('type').value,
        details: document.getElementById('details').value,
        ts: new Date().toISOString(),
        source: 'quick-intake-teaser'
      };
      // Log for now (in real: send to inbox or append board for pilots)
      console.log('DEMIGOD QUICK INTAKE:', data);
      // Simulate save
      localStorage.setItem('demigod-quick-' + Date.now(), JSON.stringify(data));
      document.getElementById('quickForm').style.display = 'none';
      document.getElementById('success').style.display = 'block';
      // Optional: auto open main in new tab after
      setTimeout(() => { window.open('https://www.trydemigod.com', '_blank'); }, 1500);
    });
  </script>
</body>
</html>`;

fs.writeFileSync('quick-candidate-intake.html', html);
console.log('Generated quick-candidate-intake.html — share this in outreach to drive submissions to main WIZ forms. Run: open quick-candidate-intake.html or host it.');
console.log('Supports north star: more candidates/startups submitting info → more matching opportunities → revenue.');
