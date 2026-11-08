#!/usr/bin/env bash
# Uso: desplegar.sh <imagen-sin-tag> <tag-nuevo>
# Política de rollback: se conserva el tag estable anterior (:latest antes de esta ejecución). Si la
# versión nueva no responde "UP" en /actuator/health, se arranca de nuevo la anterior y el script falla.
set -euo pipefail
IMG="$1"; NUEVO="$2"; PUERTO=18080

docker rm -f pg api >/dev/null 2>&1 || true
docker network create staging >/dev/null 2>&1 || true
docker run -d --name pg --network staging -e POSTGRES_DB=taskflow -e POSTGRES_USER=taskflow \
  -e POSTGRES_PASSWORD="$(openssl rand -hex 16)" postgres:16-alpine >/dev/null
# La contraseña de arriba es efímera; se relee para pasarla a la API.
PGPASS=$(docker inspect pg --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^POSTGRES_PASSWORD=//p')
for i in $(seq 1 30); do docker exec pg pg_isready -U taskflow >/dev/null 2>&1 && break; sleep 2; done

arrancar() {   # $1 = tag
  docker rm -f api >/dev/null 2>&1 || true
  docker run -d --name api --network staging -p "$PUERTO:8080" \
    -e DB_URL=jdbc:postgresql://pg:5432/taskflow -e DB_USER=taskflow -e DB_PASSWORD="$PGPASS" \
    -e JWT_SECRET="$(openssl rand -hex 32)" -e SEED=false "$IMG:$1" >/dev/null
}
saludable() {  # espera hasta 90 s a que /actuator/health responda UP
  for i in $(seq 1 45); do
    curl -fs "localhost:$PUERTO/actuator/health" 2>/dev/null | grep -q '"status":"UP"' && return 0
    sleep 2
  done
  return 1
}

ANTERIOR=""
if docker image inspect "$IMG:estable" >/dev/null 2>&1 || docker pull "$IMG:estable" >/dev/null 2>&1; then ANTERIOR="estable"; fi

arrancar "$NUEVO"
if saludable; then
  echo "OK: $IMG:$NUEVO responde UP en /actuator/health"
  docker tag "$IMG:$NUEVO" "$IMG:estable" && docker push "$IMG:estable" >/dev/null 2>&1 || echo "(no se pudo mover el tag estable; se continúa)"
  exit 0
fi

echo "::error::La versión $NUEVO no respondió UP. Registro de la API:"; docker logs --tail 40 api || true
if [ -n "$ANTERIOR" ]; then
  echo "ROLLBACK: se restaura $IMG:$ANTERIOR"
  arrancar "$ANTERIOR"; saludable && echo "Versión anterior restaurada y saludable" || echo "::error::La versión anterior tampoco responde"
else
  echo "No hay versión estable anterior a la cual volver (primer despliegue)."
fi
exit 1
