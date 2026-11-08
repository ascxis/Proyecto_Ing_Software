# Runbook — «La base de datos no responde» (TaskFlow)

**Componente:** `db` (PostgreSQL 16) y su efecto sobre `api` (Spring Boot).
**Quién lo ejecuta:** una sola persona (el desarrollador/administrador). No hay guardia ni equipo de soporte: el escalamiento es hacia el proveedor de hosting o un contacto técnico externo.
**Dónde se ejecuta:** en el servidor, dentro de la carpeta `taskflow-app/` (donde está `docker-compose.yml`).
**Verificado:** los comandos de las secciones 2 a 4 se ejecutan tal cual en el simulacro automatizado `.github/workflows/simulacro-incidente.yml` (ver el último resultado en Actions). Lo que no se pudo probar está marcado como *sin probar*.

> **Regla de oro:** nunca ejecutar `docker compose down -v` ni borrar el volumen `pgdata`: destruye los datos.

## 1. Cuándo se activa

Cualquiera de estas señales:
- La alerta de disponibilidad (SLI) cae por debajo del SLO (ver `../SLO_taskflow.md`), o el panel de Grafana muestra el porcentaje de errores 5xx subiendo.
- `GET /actuator/health` responde `DOWN` (HTTP 503) o no responde.
- Los usuarios reportan que no pueden iniciar sesión (la API devuelve 5xx).

## 2. Diagnóstico (≈ 2 minutos)

```bash
docker compose ps
docker compose logs --tail=50 db
docker compose logs --tail=50 api
docker compose exec -T api wget -qO- http://localhost:8080/actuator/health
docker compose exec -T db pg_isready -U taskflow -d taskflow
```

Nota: el puerto 8080 de la API **no está publicado** en el host; por eso la salud se consulta desde dentro del contenedor `api` (no con `curl localhost:8080`).

| Observación | Qué significa | Acción |
|---|---|---|
| `db` aparece `Exited` o no aparece | El contenedor se detuvo | 3.1 |
| `db` está `Up` pero `pg_isready` no dice `accepting connections` | PostgreSQL arrancando o sobrecargado | 3.2 |
| `db` está sana y `api` devuelve `DOWN` | La API no recuperó el pool de conexiones | 3.3 |

## 3. Mitigación

### 3.1 Contenedor de la base detenido
```bash
docker compose up -d db
docker compose exec -T db pg_isready -U taskflow -d taskflow     # repetir hasta «accepting connections»
```
Los datos siguen en el volumen `pgdata`; levantar el contenedor no los borra.

### 3.2 Base viva pero sin responder
```bash
docker compose logs --tail=100 db        # buscar «FATAL», «PANIC», «No space left on device»
df -h                                    # disco lleno: liberar espacio SIN tocar el volumen pgdata (sin probar)
docker compose restart db
```

### 3.3 La base responde, pero la API sigue en DOWN
Espere 60 segundos (el pool de conexiones se reconecta solo). Si sigue `DOWN`:
```bash
docker compose restart api
```

## 4. Verificación de la recuperación

```bash
docker compose ps                                                     # db y api en Up (db «healthy»)
docker compose exec -T api wget -qO- http://localhost:8080/actuator/health   # {"status":"UP"...}
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/auth/login \
     -H 'Content-Type: application/json' -d '{"correo":"<un usuario existente>","clave":"<su clave>"}'   # 200
```
Compruebe también que un usuario creado antes del incidente puede iniciar sesión (los datos sobrevivieron). Registre la hora de recuperación.

## 5. Si hay sospecha de pérdida o corrupción de datos (sin probar)
1. `docker compose stop api web` (detener la escritura).
2. Copie el volumen antes de cualquier reparación: `docker run --rm -v taskflow-app_pgdata:/data -v "$PWD":/copia alpine tar czf /copia/pgdata-incidente.tar.gz -C /data .` (el nombre del volumen puede variar: `docker volume ls`).
3. Restaure el último respaldo lógico si existe. **Aún no hay respaldos automáticos configurados**: es una deuda registrada (ver roadmap, FPI-31).

## 6. Escalamiento (persona única)
| Tiempo sin resolver | Acción |
|---|---|
| 0–15 min | Seguir este runbook |
| 15–60 min | Reiniciar el servidor desde el panel del proveedor; revisar disco y memoria |
| > 60 min | Contactar al proveedor de hosting y avisar a los usuarios por el canal acordado |

Completar antes de usar: proveedor de hosting (portal/teléfono), contacto técnico externo, canal de aviso a usuarios.

## 7. Después del incidente
Redactar el postmortem sin culpables el mismo día (plantilla: `docs/postmortems/`).
