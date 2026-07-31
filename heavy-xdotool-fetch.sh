#!/bin/bash
set -e
export DISPLAY="${DISPLAY:-:0}"

# Focus puppeteer Chrome window with grok
WID=$(xdotool search --name "Grok" | head -1)
if [ -z "$WID" ]; then
  WID=$(xdotool search --class "chrome" | head -1)
fi
echo "window: $WID"
xdotool windowactivate --sync "$WID"
sleep 0.5

# Click chat input area (bottom center of grok.com)
xdotool mousemove --window "$WID" 700 650
xdotool click 1
sleep 0.3

PROMPT='CODE ONLY - 3 complete javascript functions in fenced blocks: drawAlignedPlayfield(ctx,layout,lanes,time), playJazzImprov(audioCtx,dest,lane,pentatonic,stepRef), syncLaneLayout(root,layout). Full bodies for eat-the-sounds rhythm game.'

xdotool type --delay 8 -- "$PROMPT"
sleep 0.2
xdotool key Return
echo "sent via xdotool"