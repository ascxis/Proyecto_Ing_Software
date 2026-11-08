# Roadmap técnico de TaskFlow — próximos 6 meses (nov. 2026 – may. 2027)

Cada hito tiene un **disparador** (cuándo se aborda) y una justificación de negocio. Son propuestas del estudiante, no compromisos con un cliente.

| # | Hito | Tipo | Disparador | Justificación de negocio |
|---|---|---|---|---|
| 1 | Desplegar en Render con URL pública (secreto `RENDER_DEPLOY_HOOK`, variable `RENDER_HEALTH_URL`) y regla de alerta de 5xx en Prometheus | Adaptativo | Antes del primer usuario real | Hoy no hay producción pública (FPI-27 pendiente); sin alerta, una caída depende de que alguien mire el panel |
| 2 | Respaldos automáticos diarios (`pg_dump`) fuera del servidor y prueba mensual de restauración | Preventivo | Antes de guardar datos reales | El runbook (sección 5) lo da por pendiente; una pérdida de datos no tiene recuperación |
| 3 | Migraciones con Flyway en lugar de `ddl-auto: update` | Preventivo | Primer cambio de esquema tras salir a producción | `update` no es reversible ni auditable; puede dejar la base en estado inconsistente |
| 4 | Migrar a Spring Boot 4 / Spring Framework 7 y retirar las dos exclusiones de `.trivyignore` (CVE-2026-47884 y 47890) | Adaptativo | Cuando haya versión estable o cambie el uso de vistas | La corrección gratuita de esos CVE exige Framework 7 (ADR-12) |
| 5 | Pruebas E2E (Playwright, 14 casos) en CI y un caso de título malicioso (XSS) | Preventivo | Cualquier cambio en el frontend | Hoy corren a mano; D2 y D6 se pagaron por diseño sin prueba automática |
| 6 | Publicar el contrato Pact en un Pact Broker | Preventivo | Aparición de un segundo consumidor de la API | El contrato es hoy un archivo escrito a mano y verificado en el proveedor |

Lo que **no** está en el roadmap a propósito: microservicios, Kubernetes, tiempo real con WebSockets (ver ADR-03 y ADR-05): ningún escenario medido los justifica.
