#!/bin/sh
set -eu
cd /workspace
if [ -f /tmp/zunoza-owner.env ]; then
  set -a
  # shellcheck disable=SC1091
  . /tmp/zunoza-owner.env
  set +a
fi
if [ -f /tmp/zunoza-r2.env ]; then
  set -a
  # shellcheck disable=SC1091
  . /tmp/zunoza-r2.env
  set +a
fi
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
