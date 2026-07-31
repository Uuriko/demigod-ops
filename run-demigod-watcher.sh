#!/usr/bin/env bash
# Delegates to supervisor (auto-restart + turn-complete reprompt)
cd /home/potter
exec ./run-demigod-supervisor.sh "$@"