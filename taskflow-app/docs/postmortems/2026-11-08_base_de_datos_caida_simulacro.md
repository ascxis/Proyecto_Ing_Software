# Postmortem sin culpables (simulado) — base de datos caída

**Tipo:** simulacro automatizado (`.github/workflows/simulacro-incidente.yml`, ejecución 42510473161). Es un incidente **simulado**; las mediciones son reales y vienen de ese registro. Participante: una persona (único responsable).

## Resumen
El contenedor `db` se detuvo y la API quedó sin base de datos. El sistema se recuperó siguiendo el runbook, sin pérdida de datos.

## Cronología (hora UTC del registro)
| Hora | Hecho |
|---|---|
| 18:33:25 | T0: `docker compose stop db` (se detiene la base) |
| 18:33:25 | La salud de la API deja de ser UP en menos de 1 s |
| 18:33:55 | El login (`POST /api/auth/login`) devuelve **500** tras ~30 s de espera |
| +61 s | `pg_isready`: la base vuelve a aceptar conexiones (`docker compose up -d db`) |
| +63 s | `/actuator/health` en UP **sin reiniciar la API** |
| +63 s | Login de un usuario creado antes del incidente: 200 (los datos sobrevivieron) |

## Impacto
~63 s de indisponibilidad: 63 s ÷ 25 920 s (presupuesto de 432 min del SLO de 99 %) = **0,24 % del presupuesto mensual**. Sin pérdida de datos.

## Causa raíz (de proceso, no de persona)
Se supuso que la persona detuvo la base de datos por mantenimiento. Lo que permitió que ocurriera un fallo visible para el usuario es sistémico:
1. **No hay degradación controlada:** sin base de datos, la API responde 500 (error interno) tras 30 s de espera del pool de conexiones, en lugar de 503 inmediato con un mensaje claro.
2. **No hay alerta automática:** la detección depende de que una persona mire la salud o el panel; no hay regla de alerta en Prometheus.
3. **No hay procedimiento de mantenimiento** (aviso previo/ventana) ni respaldos automáticos.

## Qué funcionó
- El volumen `pgdata` conservó los datos; el pool de conexiones se reconectó solo.
- El runbook se ejecutó tal cual, y sus comandos funcionaron en el entorno real.

## Acciones
| Acción | Estado |
|---|---|
| Responder 503 con mensaje claro cuando falla la base y bajar el tiempo de espera del pool a 5 s | **Hecha y verificada** (PR #23). Repetido el simulacro (ejecución 42512144476): el login durante el incidente devuelve **503** (antes 500) y el servicio queda sano a los **11 s** (antes 63 s); login posterior 200 |
| Regla de alerta en Prometheus por tasa de 5xx | Parcial: la regla existe (PR #27), pero sin Alertmanager ni canal de aviso no notifica a nadie |
| Respaldos automáticos de la base de datos | Parcial: restauración ensayada en CI (`respaldo.yml`, ejecución 42532331664, base efímera); siguen sin programarse respaldos de la base de Render (ROADMAP hito 2) |
