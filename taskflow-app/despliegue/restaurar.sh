#!/usr/bin/env bash
# Restaura un respaldo en una base NUEVA (no toca la base en uso). Uso:  ./despliegue/restaurar.sh archivo.dump [base_destino]
# Para sustituir la base en uso: detenga la API (docker compose stop api), restaure aquí, verifique los datos y renombre
# las bases con ALTER DATABASE ... RENAME TO ..., o repita la restauración sobre la base definitiva.
set -euo pipefail
ARCHIVO="${1:?Indique el archivo .dump}"
BASE="${2:-taskflow_restaurada}"
docker compose exec -T db psql -U taskflow -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$BASE\"" -c "CREATE DATABASE \"$BASE\""
docker compose exec -T db pg_restore -U taskflow -d "$BASE" --no-owner --exit-on-error < "$ARCHIVO"
echo "Restaurado en la base: $BASE"
