#!/bin/bash
# Local helper: (re)start or stop the API server in the background.
#   scripts/devserver.sh restart | stop
PIDF=/tmp/prepledger-server.pid
if [ -f "$PIDF" ]; then
  PGID=$(cat "$PIDF")
  kill -- -"$PGID" 2>/dev/null
  rm -f "$PIDF"
  sleep 1
fi
if [ "$1" = "restart" ]; then
  cd "$(dirname "$0")/.." || exit 1
  setsid npx tsx server/index.ts > /tmp/prepledger-server.log 2>&1 < /dev/null &
  echo $! > "$PIDF"
  for _ in $(seq 1 40); do curl -s -o /dev/null localhost:4000/api/health && break; sleep 0.5; done
  curl -s localhost:4000/api/health; echo
fi
