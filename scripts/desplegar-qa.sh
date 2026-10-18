#!/usr/bin/env bash
# =====================================================================================================
# Actualizar QA con TODO lo que esté mezclado en `develop` (sincroniza la copia que mira Vercel).
#
#   scripts/desplegar-qa.sh               → solo muestra el plan (no cambia nada)
#   scripts/desplegar-qa.sh --confirmar   → hace el despliegue y verifica
#
# Hace falta tener activa la cuenta de GitHub dueña de la copia (javier-r-ramos):
#   gh auth switch --hostname github.com --user javier-r-ramos
# Los cambios de base de datos NO se aplican solos: mira docs/despliegue-y-sql-pendiente.md.
# =====================================================================================================
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

QA_FRONT="${QA_FRONT_URL:-https://sigev-qa.vercel.app}"
QA_API="${QA_API_URL:-https://sigev-api-qa.vercel.app}"
CONFIRMAR=no; [ "${1:-}" = "--confirmar" ] && CONFIRMAR=si

git remote get-url vercel >/dev/null 2>&1 || { echo "✗ No existe el remoto «vercel» (la copia del repositorio conectada a Vercel). Ver docs/proceso-de-despliegue.md."; exit 1; }
git fetch -q origin
if ! git fetch -q vercel 2>/dev/null; then
  echo "✗ No se pudo leer la copia de Vercel. ¿Está activa la cuenta dueña de la copia?"
  echo "  gh auth switch --hostname github.com --user javier-r-ramos"; exit 1
fi

if ! git merge-base --is-ancestor vercel/develop origin/develop; then
  echo "✗ La copia de QA tiene commits que no están en develop: NO es un avance limpio y no se empuja."; exit 1
fi
N=$(git rev-list --count vercel/develop..origin/develop)
echo "QA está en:      $(git log --oneline -1 vercel/develop)"
echo "develop está en: $(git log --oneline -1 origin/develop)"
if [ "$N" -eq 0 ]; then echo "✓ QA ya tiene todo lo de develop. No hay nada que desplegar."; exit 0; fi
echo; echo "Se van a desplegar $N commits ($(git diff --shortstat vercel/develop origin/develop)):"
git log --oneline --merges vercel/develop..origin/develop | sed 's/^/   /'
echo
echo "⚠️  Antes de desplegar: ¿hay SQL pendiente para QA? → docs/despliegue-y-sql-pendiente.md (sección «Pendiente en QA»)"
echo "    Se puede desplegar el código primero y correr el SQL después, salvo donde la guía diga lo contrario."

if [ "$CONFIRMAR" != "si" ]; then
  echo; echo "(Simulación: no se cambió nada. Para desplegar:  scripts/desplegar-qa.sh --confirmar)"; exit 0
fi

echo; echo "→ Empujando develop a la copia de Vercel…"
git push vercel origin/develop:refs/heads/develop

echo "→ Esperando a que Vercel publique el frontend (hasta 6 minutos)…"
hash_actual() { curl -s "$QA_FRONT/" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1; }
ANTES="${HASH_ANTES:-}"
for i in $(seq 1 24); do
  sleep 15
  AHORA="$(hash_actual || true)"
  [ -n "$AHORA" ] && [ -n "$ANTES" ] && [ "$AHORA" != "$ANTES" ] && { echo "✓ Frontend nuevo publicado ($AHORA)"; break; }
  ANTES="${ANTES:-$AHORA}"
done

echo "→ Verificando la API de QA…"
echo "   health:               $(curl -s -o /dev/null -w '%{http_code}' "$QA_API/api/health") (debe ser 200)"
echo "   ruta sin sesión:      $(curl -s -o /dev/null -w '%{http_code}' "$QA_API/api/inventario") (debe ser 401)"
echo "   login con datos falsos: $(curl -s -o /dev/null -w '%{http_code}' -X POST "$QA_API/api/auth/login" -H 'content-type: application/json' -d '{"usuario":"no-existe","password":"x"}') (debe ser 401)"
echo; echo "Listo. Siguiente: correr el SQL pendiente de QA y abrir $QA_FRONT para probar."
