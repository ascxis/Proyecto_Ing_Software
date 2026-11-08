# Evidencia de verificación en CI (GitHub Actions, PostgreSQL 16 + k6)

Workflow `verificacion.yml`, ejecución 42497878883 (commit d6fdbe3). Todos los umbrales pasaron.

| Escenario | Medida exigida (FPI-18) | Resultado medido |
|---|---|---|
| S-1 Seguridad (RN-02) | 40/40 intentos de un no asignado rechazados con 403; < 300 ms | 40/40 con 403, 0 fallos; latencia máx. 9,29 ms |
| S-3 Fiabilidad | 0 actualizaciones perdidas en 100 pares concurrentes (uno 200, otro 409) | 100 pares, 0 perdidas |
| S-4 Desempeño | 20 usuarios concurrentes; p95 < 800 ms; < 1 % de errores | p95 = 38,24 ms; 0 % de errores en el escenario (≈474 solicitudes/s) |

Nota: el escenario S-4 se ejecutó en un runner compartido de GitHub (2 vCPU) con la API y la base en la misma máquina; sirve como verificación del escenario, no como medición de producción.
