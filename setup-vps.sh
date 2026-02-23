#!/bin/bash
# NanoClaw VPS Setup Script
# Run this on a fresh GCP VPS (Ubuntu 24.04, e2-standard-2)
#
# Usage:
#   1. Copy this file to your VPS
#   2. Edit ANTHROPIC_API_KEY + TELEGRAM_BOT_TOKEN in .env after setup
#   3. Run: chmod +x setup-vps.sh && ./setup-vps.sh

set -euo pipefail

echo "=== NanoClaw VPS Setup ==="

# --- 1. Install system dependencies ---
echo "[1/7] Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl git

# --- 2. Install Node.js 22 ---
echo "[2/7] Installing Node.js 22..."
if ! command -v node &>/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
  sudo apt-get install -y -qq nodejs
fi
echo "  Node.js: $(node -v)"
echo "  npm: $(npm -v)"

# --- 3. Install Docker ---
echo "[3/7] Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo "  Docker installed. You may need to log out and back in for group changes."
else
  echo "  Docker already installed: $(docker --version)"
fi

# --- 4. Clone NanoClaw ---
echo "[4/7] Cloning NanoClaw..."
NANOCLAW_DIR="$HOME/nanoclaw"
if [ -d "$NANOCLAW_DIR/.git" ]; then
  echo "  Already cloned, pulling latest..."
  cd "$NANOCLAW_DIR"
  git pull --ff-only
else
  git clone https://github.com/qwibitai/nanoclaw.git "$NANOCLAW_DIR"
  cd "$NANOCLAW_DIR"
fi

# --- 5. Install npm dependencies ---
echo "[5/7] Installing npm dependencies..."
npm install

# --- 6. Create config files ---
echo "[6/7] Creating config files..."

# Dockerfile.custom (upgrade-safe overlay)
cat > Dockerfile.custom << 'EOF'
FROM nanoclaw-agent:latest
ENV ANTHROPIC_BASE_URL=https://api.ai4u.now
ENV ANTHROPIC_MODEL=sonnet-4.6
EOF

# .env (only if it doesn't exist — don't overwrite user's key)
if [ ! -f .env ]; then
  cat > .env << 'EOF'
# NanoClaw configuration
ANTHROPIC_API_KEY=REPLACE_WITH_YOUR_API4U_KEY
TELEGRAM_BOT_TOKEN=REPLACE_WITH_YOUR_TELEGRAM_BOT_TOKEN
ASSISTANT_NAME=Andy
CONTAINER_IMAGE=nanoclaw-agent-custom:latest
MAX_CONCURRENT_CONTAINERS=3
CONTAINER_TIMEOUT=1800000
IDLE_TIMEOUT=1800000
EOF
  echo "  Created .env — EDIT IT to set your ANTHROPIC_API_KEY and TELEGRAM_BOT_TOKEN!"
else
  echo "  .env already exists, skipping"
fi

# --- 7. Build container images ---
echo "[7/7] Building container images..."
docker build -t nanoclaw-agent:latest container/
docker build -t nanoclaw-agent-custom:latest -f Dockerfile.custom .

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit .env and set your ANTHROPIC_API_KEY + TELEGRAM_BOT_TOKEN"
echo "  2. Build the project: npm run build"
echo "  3. Authenticate WhatsApp: npm run auth"
echo "  4. Start (loads .env into process env): set -a; source .env; set +a; npm start"
echo ""
echo "For production (systemd):"
echo "  sudo cp nanoclaw.service /etc/systemd/system/"
echo "  sudo systemctl enable nanoclaw"
echo "  sudo systemctl start nanoclaw"
