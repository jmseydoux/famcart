#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Couleurs
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}FamCart — démarrage en local${NC}"
echo "------------------------------"

# Vérifie que les node_modules sont installés
if [ ! -d "$ROOT/backend/node_modules" ]; then
  echo -e "${YELLOW}Installation des dépendances backend...${NC}"
  npm --prefix "$ROOT/backend" install
fi

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo -e "${YELLOW}Installation des dépendances frontend...${NC}"
  npm --prefix "$ROOT/frontend" install
fi

# Démarre le backend en arrière-plan
echo -e "${CYAN}[backend]${NC}  http://localhost:3000"
npm --prefix "$ROOT/backend" run dev &
BACKEND_PID=$!

# Petite pause pour laisser le backend démarrer
sleep 2

# Démarre le frontend en arrière-plan
echo -e "${CYAN}[frontend]${NC} http://localhost:5173"
npm --prefix "$ROOT/frontend" run dev &
FRONTEND_PID=$!

echo ""
echo -e "Ctrl+C pour tout arrêter."
echo ""

# Arrête les deux processus proprement à la sortie
cleanup() {
  echo ""
  echo "Arrêt des serveurs..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  echo "Au revoir."
}
trap cleanup INT TERM

# Attend que l'un des deux processus se termine (erreur)
wait "$BACKEND_PID" "$FRONTEND_PID"
