#!/bin/bash
# Pulls the latest code and (re)starts the date planner.
# Run:  bash scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Pulling latest code"
git pull --ff-only || echo "(git pull skipped)"

if [ ! -f .env ]; then
  cp .env.example .env
  chmod 600 .env
  echo
  echo "Created .env. Set your passcode and names first:"
  echo "  nano .env"
  echo "Then run this script again."
  exit 1
fi

# Fill in a random cookie secret if it's empty
if ! grep -q '^SESSION_SECRET=.\+' .env; then
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -hex 32)|" .env
fi

if grep -q 'choose-a-passcode-only-you-two-know' .env; then
  echo "Change SITE_PASSCODE in .env before deploying:  nano .env"
  exit 1
fi

echo "==> Building and starting"
docker compose up -d --build
docker image prune -f >/dev/null

echo
docker compose ps
echo
echo "Test with:  curl localhost/health"
