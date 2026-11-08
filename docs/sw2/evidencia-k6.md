# Evidencia de verificación en CI (GitHub Actions, PostgreSQL 16 + k6)

Workflow `verificacion.yml`, ejecución 42497878883 (commit d6fdbe3). Todos los umbrales pasaron.

| Escenario | Medida exigida (FPI-18) | Resultado medido |
|---|---|---|
| S-1 Seguridad (RN-02) | 40/40 intentos de un no asignado rechazados con 403; < 300 ms | 40/40 con 403, 0 fallos; latencia máx. 9,29 ms |
| S-3 Fiabilidad | 0 actualizaciones perdidas en 100 pares concurrentes (uno 200, otro 409) | 100 pares, 0 perdidas |
| S-4 Desempeño | 20 usuarios concurrentes; p95 < 800 ms; < 1 % de errores | p95 = 38,24 ms; 0 % de errores en el escenario (≈474 solicitudes/s) |

Nota: el escenario S-4 se ejecutó en un runner compartido de GitHub (2 vCPU) con la API y la base en la misma máquina; sirve como verificación del escenario, no como medición de producción.

## Rampa de 50 usuarios sobre PATCH /api/tareas/{id}/estado (Guía 8)

Workflow `verificacion.yml`, commit 36afdfa. Script `taskflow-app/pruebas-carga/rampa-estado.js` (rampa 20 s → 50 VU, 30 s sostenido, 10 s de bajada; guarda anti-producción).

| Umbral | Resultado |
|---|---|
| p95 < 800 ms | p95 = 39,75 ms (promedio 15,97 ms, máx. 150,4 ms) |
| errores < 1 % | 0,00 % (0 de 137 714 solicitudes) |
| checks > 99 % | 100 % (137 661 cambios de estado con 200) |

Rendimiento medio ≈ 2 276 solicitudes/s en un runner compartido de 2 vCPU con API y PostgreSQL en la misma máquina.

## TDD de Avance.porcentaje (RN-10)

| Fase | Commit | CI |
|---|---|---|
| Rojo | a0bb30d | falla: AvanceTest 5 errores (UnsupportedOperationException) |
| Verde | 3f21878 | pasa: 35 pruebas, 0 fallos |
| Refactor | 36afdfa | pasa: ProyectoService usa Avance.porcentaje |
