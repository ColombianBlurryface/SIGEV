#!/usr/bin/env bash
# =====================================================================================================
# Publicar en PRODUCCIÓN lo que ya probaste en QA. Tiene dos fases porque en el medio alguien mezcla un PR:
#
#   scripts/desplegar-produccion.sh preparar [--confirmar]   → abre el PR «develop → main» (el «release»)
#   (alguien revisa y MEZCLA ese PR en GitHub)
#   scripts/desplegar-produccion.sh publicar [--confirmar]   → sincroniza main con la copia de Vercel y verifica
#
# Sin --confirmar solo muestra el plan y no cambia nada. Hace falta la cuenta de GitHub dueña de la copia
# (javier-r-ramos) para «publicar». Los cambios de base de datos NO se aplican solos:
# mira docs/despliegue-y-sql-pendiente.md (sección «Pendiente en producción») y córrelos ANTES de publicar.
# =====================================================================================================
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

REPO="ColombianBlurryface/SIGEV"
PROD_FRONT="${PROD_FRONT_URL:-https://sigev-nine.vercel.app}"
PROD_API="${PROD_API_URL:-https://sigev-api.vercel.app}"
FASE="${1:-}"; CONFIRMAR=no; [ "${2:-}" = "--confirmar" ] && CONFIRMAR=si
git fetch -q origin

case "$FASE" in
  preparar)
    N=$(git rev-list --count origin/main..origin/develop)
    echo "main (producción) está en: $(git log --oneline -1 origin/main)"
    echo "develop está en:           $(git log --oneline -1 origin/develop)"
    [ "$N" -eq 0 ] && { echo "✓ Producción ya tiene todo lo de develop."; exit 0; }
    echo; echo "El release llevaría $N commits ($(git diff --shortstat origin/main origin/develop)):"
    git log --oneline --merges origin/main..origin/develop | sed 's/^/   /'
    echo
    echo "⚠️  Antes de abrirlo, confirma que esto ya se probó en QA y revisa el SQL pendiente de producción:"
    echo "    docs/despliegue-y-sql-pendiente.md"
    if [ "$CONFIRMAR" != "si" ]; then echo; echo "(Simulación. Para abrir el PR:  scripts/desplegar-produccion.sh preparar --confirmar)"; exit 0; fi
    gh pr create --repo "$REPO" --base main --head develop \
      --title "Release a producción: $(date +%Y-%m-%d)" \
      --body "Lleva a producción lo que ya se probó en QA ($N commits). Antes de mezclar: el SQL pendiente de producción (docs/despliegue-y-sql-pendiente.md) ya se ejecutó y el equipo de QA dio el visto bueno."
    echo; echo "→ Ahora revisa y MEZCLA ese PR en GitHub. Después:  scripts/desplegar-produccion.sh publicar --confirmar"
    ;;
  publicar)
    git remote get-url vercel >/dev/null 2>&1 || { echo "✗ No existe el remoto «vercel»."; exit 1; }
    git fetch -q vercel 2>/dev/null || { echo "✗ No se pudo leer la copia de Vercel. gh auth switch --hostname github.com --user javier-r-ramos"; exit 1; }
    if ! git merge-base --is-ancestor origin/develop origin/main; then
      echo "✗ main todavía NO tiene todo lo de develop: el PR del release no está mezclado."; exit 1
    fi
    echo "main (equipo):  $(git log --oneline -1 origin/main)"
    echo "main (copia):   $(git log --oneline -1 vercel/main)"
    [ "$(git rev-parse origin/main)" = "$(git rev-parse vercel/main)" ] && { echo "✓ La copia de producción ya está al día."; exit 0; }
    echo
    echo "Se hará: git switch espejo-vercel → merge origin/main → git push vercel espejo-vercel:main"
    echo "(la rama espejo-vercel conserva el vercel.json de la raíz que necesita la copia)"
    if [ "$CONFIRMAR" != "si" ]; then echo; echo "(Simulación. Para publicar:  scripts/desplegar-produccion.sh publicar --confirmar)"; exit 0; fi
    git switch espejo-vercel
    git merge --no-edit origin/main
    git push vercel espejo-vercel:main
    echo "→ Verificando producción (puede tardar unos minutos en redesplegar)…"
    sleep 60
    echo "   frontend:             $(curl -s -o /dev/null -w '%{http_code}' "$PROD_FRONT/") (debe ser 200)"
    echo "   health:               $(curl -s -o /dev/null -w '%{http_code}' "$PROD_API/api/health") (debe ser 200)"
    echo "   ruta sin sesión:      $(curl -s -o /dev/null -w '%{http_code}' "$PROD_API/api/inventario") (debe ser 401)"
    echo "   login con datos falsos: $(curl -s -o /dev/null -w '%{http_code}' -X POST "$PROD_API/api/auth/login" -H 'content-type: application/json' -d '{"usuario":"no-existe","password":"x"}') (debe ser 401)"
    git switch develop
    echo "Listo. Abre $PROD_FRONT e inicia sesión para comprobar."
    ;;
  *)
    echo "Uso: scripts/desplegar-produccion.sh preparar|publicar [--confirmar]"; exit 1;;
esac
