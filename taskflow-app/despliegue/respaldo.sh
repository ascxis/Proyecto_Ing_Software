#!/usr/bin/env bash
# Respaldo lógico de PostgreSQL (guía 14). Uso:  ./despliegue/respaldo.sh [carpeta_destino]
# Ejecutar dentro de taskflow-app/ con la pila levantada. Conserva los últimos RETENCION respaldos (por defecto 7).
# IMPORTANTE: copie la carpeta a un lugar DISTINTO del servidor (otro equipo o almacenamiento externo); un respaldo
# guardado solo en el mismo disco no protege de la pérdida del servidor.
set -euo pipefail
DESTINO="${1:-respaldos}"
RETENCION="${RETENCION:-7}"
mkdir -p "$DESTINO"
ARCHIVO="$DESTINO/taskflow-$(date +%Y-%m-%d-%H%M%S).dump"
docker compose exec -T db pg_dump -U taskflow -Fc taskflow > "$ARCHIVO"
test -s "$ARCHIVO" || { echo "Respaldo vacío; se elimina" >&2; rm -f "$ARCHIVO"; exit 1; }
echo "Respaldo creado: $ARCHIVO ($(wc -c < "$ARCHIVO") bytes)"
# Rotación: borra los más antiguos que excedan RETENCION
ls -1t "$DESTINO"/taskflow-*.dump | tail -n +"$((RETENCION + 1))" | xargs -r rm -f
