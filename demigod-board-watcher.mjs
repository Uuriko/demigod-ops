#!/usr/bin/env node
// Board write-time watcher. Run with: node demigod-board-watcher.mjs or via entr
import { watch } from 'fs';
import { execSync } from 'child_process';
console.log('Watching DEMIGOD-BOARD.json for changes...');
watch('DEMIGOD-BOARD.json', (eventType) => {
  if (eventType === 'change') {
    try {
      execSync('node demigod-verify-board-honesty.mjs', {stdio: 'inherit'});
      console.log('Board change verified OK at', new Date().toISOString());
    } catch (e) {
      console.error('Board honesty FAIL on change!', e.message);
      // Could trigger quarantine here
    }
  }
});
