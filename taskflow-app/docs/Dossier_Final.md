# Dossier Técnico Final — TaskFlow, Sistema de Gestión de Tareas

Proyecto individual de Ingeniería de Software II (Universidad de Pamplona). Autor: Andrés Felipe Florez Mora, en todos los roles. Cierre: 8 de noviembre de 2026.

**Regla de este documento:** cada afirmación cita la evidencia que la sostiene (ejecución del pipeline, archivo del repositorio o ficha). Lo que no pudo verificarse está marcado PENDIENTE.

## 1. Estado del sistema
- Repositorio: https://github.com/ascxis/Proyecto_Ing_Software (release `v1.0.0`).
- URL de producción: **PENDIENTE.** No existe una URL pública. Evidencia alternativa: la imagen `ghcr.io/ascxis/taskflow-api:2c9d4b7074ae` se despliega en un entorno de staging dentro del pipeline y supera el healthcheck (ejecución 42509375393). El despliegue en Render requiere una cuenta y los secretos `RENDER_DEPLOY_HOOK` y `RENDER_HEALTH_URL`, que están pendientes.
- Video de demostración: **PENDIENTE** (no pude grabarlo).

## 2. Línea de tiempo (FPI-17 a FPI-31)

| Ficha | Decisión clave | ¿Se mantuvo o cambió? | Estado final |
|---|---|---|---|
| FPI-17 | ADR-01: tratar el prototipo como sistema heredado y pagar deuda de forma selectiva, sin reescribirlo | Se mantuvo | Inventario D1–D9: 6 pagadas con evidencia, 2 por diseño sin prueba automática, 1 parcial |
| FPI-18 | ADR-02: priorizar seguridad, mantenibilidad y fiabilidad sobre alta disponibilidad y escalabilidad; SLO de 99 % | Se mantuvo | Escenarios S-1 a S-4 verificados en CI; la usabilidad sigue PENDIENTE (requiere ≥ 5 personas) |
| FPI-19 | ADR-03: monolito con núcleo hexagonal selectivo; se descartaron microservicios, capas clásicas y hexagonal total | Se mantuvo | Vigente |
| FPI-20 | ADR-04: extraer CambiarEstadoTarea a un núcleo con dos puertos de salida | Cambió: de 19 tipos propuestos por la IA a 6 en core y 3 en adapter | PR #17 fusionado; 9 pruebas del núcleo en 0,088 s sin base de datos |
| FPI-21 | ADR-05: mantener el monolito modular y diferir la distribución | Se mantuvo | Notificaciones queda como primer candidato a separarse |
| FPI-22 | ADR-06: contrato OpenAPI Design-First con JWT bearer | Se mantuvo; se corrigió el contrato de la IA y se enmascararon los correos de GET /api/usuarios | docs/openapi.yaml vigente |
| FPI-23 | ADR-07: pruebas de integración con Spring y H2, sin mocks del negocio | Se mantuvo | 42 pruebas (28 de integración y 14 unitarias); contrato Pact escrito a mano |
| FPI-24 | ADR-08: TDD para reglas puras y prueba de carga k6 con umbrales en el pipeline | Se mantuvo | p95 = 39,75 ms con 137 714 peticiones y 0 errores (umbral 800 ms) |
| FPI-25 | ADR-09: pipeline de tres etapas con Quality Gate bloqueante y un único chequeo obligatorio | Cambió: un job agregador «Build, Lint y Pruebas» tras un renombrado que bloqueó fusiones | Regla de rama proteger-main activa; el PR #19 demostró el bloqueo |
| FPI-26 | ADR-10: imágenes multietapa no root con Compose, volumen y red interna | Cambió: el frontend pasó de nginx como root en el puerto 80 a nginx-unprivileged en el 8080 | Backend 1,32 GB → 387 MB; frontend 74 MB |
| FPI-27 | ADR-11: CD con publicación en GHCR, staging con healthcheck obligatorio y rollback | Cambió: el healthcheck pasó de opcional a bloqueante; Render quedó opcional | Staging UP con la imagen ghcr.io/ascxis/taskflow-api:2c9d4b7074ae (ejecución 42509375393); Render PENDIENTE |
| FPI-28 | ADR-12: SAST y SCA bloqueantes con Semgrep y Trivy | Se mantuvo; se descartó Dependency-Check | 0 hallazgos corregibles abiertos; 2 CVE excluidos con justificación |
| FPI-29 | ADR-13: observabilidad mínima con Micrometer y OpenTelemetry, logs JSON y pila Prometheus + Grafana opcional | Cambió: se reemplazó el SDK y el codificador de logs de la IA por Micrometer y el logging nativo | 211 peticiones, p95 ≈ 11 ms, 0 % de 5xx; sin datos personales en la telemetría |
| FPI-30 | ADR-14: SLO de 99 % (432 min/mes), runbook de persona única y degradación a 503 | Cambió: el login pasó de 500 tras 30 s a 503 inmediato tras el simulacro | Recuperación en 11 s tras volver la base; login 200 al final |
| FPI-31 | ADR-15: pagar la deuda de seguridad y de pruebas ya; convivir con el resto con un disparador | Se mantuvo | Roadmap de 6 hitos; refactor preventivo del PR #22 con 48/48 pruebas |

## 3. Decisiones defendidas

| ADR | Decisión | Evidencia |
|---|---|---|
| ADR-05 | Mantener el monolito modular y no distribuir ningún contexto | p95 ≈ 11 ms a ≈ 3,1 peticiones/s y 0 % de 5xx (ejecución 42512144497); k6: p95 = 39,75 ms, 137 714 peticiones, 0 errores. Memoria: app + base + web ≈ 385 MiB frente a ≈ 117 MiB de la pila de observabilidad. Costo: ≥ ≈ 86 USD/mes distribuido frente a ≈ 4–5 USD. |
| ADR-10 | Imágenes multietapa no root, secretos obligatorios y red interna | Backend 1,32 GB (una etapa) → 387 MB (multietapa), ejecución 42505108992; frontend con uid 101 verificado; la API no arranca sin contraseña ni JWT_SECRET. |
| ADR-14 | SLO de 99 % con presupuesto de 432 min, runbook y degradación a 503 | Simulacro de base caída: antes, login 500 tras ≈ 30 s y API recuperada +63 s (ejecución 42510473161); después, 503 durante el incidente y recuperación en 11 s (ejecución 42512144476). El incidente de 63 s consumió el 0,24 % del presupuesto de 99 %. |

## 4. Indicadores en vivo

| Indicador | Estado verificable |
|---|---|
| Cobertura de pruebas | 91,4 % en código nuevo (JaCoCo en SonarCloud); 50 pruebas de backend (14 unitarias y 36 de integración, contrato, observabilidad y 503) con Quality Gate aprobado en el PR #23. No se midió la cobertura del código antiguo ni la del frontend. |
| Vulnerabilidades críticas pendientes | 0 hallazgos altos o críticos corregibles en Semgrep y Trivy. Hay 2 CVE de spring-webmvc (CVE-2026-47884 y CVE-2026-47890) excluidos en .trivyignore con justificación, porque su corrección exige Spring Framework 7; no son cero absolutos. |
| SLO | Definido en 99 % mensual (432 min de presupuesto) con SLI de latencia p95 < 800 ms. Verificado solo en un simulacro y en pruebas sintéticas en CI; no hay un SLO cumplido sobre tráfico real. |
| Uptime real del dashboard | No medido: no hay sistema en producción pública, y la captura del dashboard solo existe como artefacto de GitHub Actions (evidencia-observabilidad) que no pude descargar ni ver. Marcado PENDIENTE. |

## 5. Bitácora forense de uso de IA

Alcance: solo FPI-17 a FPI-31. Las fichas de Ingeniería de Software I no están en este repositorio y no se cuentan. Resultado: 40 hallazgos en las respuestas de la IA; 16 son contenido inventado o que no corresponde al sistema real (alucinación en sentido estricto). Detalle en [Bitacora_IA_SW2.md](ia/Bitacora_IA_SW2.md).
- Licencias restrictivas encontradas: 0.
- Dependencias o herramientas rechazadas: 11 (OWASP Dependency-Check, Checkstyle, atestación de procedencia, logstash-logback-encoder, starter y SDK de OpenTelemetry, Redis, S3/MinIO, Keycloak, Elasticsearch, CodeScene).
- Privacidad: se enmascararon los correos de GET /api/usuarios y se verificó que la telemetría no contiene datos personales.
- Auditoría de la auditora: una sesión nueva de IA auditó la bitácora (`ia/p16.txt`, `ia/r16.md`); fue honesta, pero cometió cinco inexactitudes propias, descritas en la ficha FPI-32.
- Límites de la bitácora (señalados por la auditora y aceptados): sin denominador de respuestas totales, sin columna de gravedad, verificada por una sola persona. Solo sostiene conclusiones cualitativas, no una tasa de error.

## 6. Deuda técnica residual aceptada

| Componente | Tipo | Justificación y plan de pago |
|---|---|---|
| Base de datos (N2: sin respaldos automáticos) | Operativa, deliberada e imprudente | Hoy no hay datos reales; antes del primer usuario se implementa pg_dump diario fuera del servidor con prueba mensual de restauración (hito 2 del roadmap, dic. 2026). La sección de respaldo del runbook sigue sin probarse. |
| Persistencia (N1: ddl-auto: update en vez de migraciones) | Técnica, deliberada y prudente | Es reversible y está acotado a un esquema pequeño; se migra a Flyway con el primer cambio de esquema en producción (hito 3, ene. 2027). |
| Dependencias (N3: 2 CVE excluidos en .trivyignore) | De seguridad, deliberada y prudente | No son alcanzables en una API REST sin vistas; la corrección exige Spring Framework 7. Se retira la exclusión al migrar (hito 4, feb. 2027) y se revisa en cada actualización. |

El inventario completo y el roadmap están en [ROADMAP.md](ROADMAP.md).

## 7. Lo que no está demostrado
- Ningún usuario real usó el sistema: la validación (que resuelva el problema de la organización) está pendiente; lo verificado es la conformidad técnica.
- La usabilidad no se midió (requiere al menos 5 personas).
- Las cifras de rendimiento son sintéticas, medidas en el servidor de CI; el costo de la alternativa distribuida y la retención de datos de observabilidad son estimaciones.
- No se midió el efecto de la telemetría sobre la latencia.
- No hay alerta automática de 5xx ni respaldos implementados.
- Pruebas E2E y de XSS no automatizadas; N6 (PATCH de edición sin validar título en blanco) sin confirmar.

## 8. Lecciones aprendidas

Técnicas. Lo que no se ejecuta no está verificado: casi todo lo importante de este semestre se confirmó en el pipeline y no en mi máquina, y varias veces el pipeline me contradijo (un job renombrado bloqueó la fusión, un chequeo de datos personales dio un falso positivo, nginx devolvía 200 para una ruta inexistente). Un refactor se hace con pruebas de caracterización escritas antes, no después. Un pipeline solo protege si puede decir que no, así que probé el Quality Gate intentando romperlo. Y un simulacro enseña más que un diseño: al apagar la base de datos descubrí que el login devolvía 500 después de 30 segundos, y lo cambié a un 503 inmediato.

De proceso. Un ADR corto, con la alternativa descartada y la consecuencia negativa, evitó discutir dos veces lo mismo y me permitió defender decisiones con datos. La deuda técnica no se paga toda: se paga la de seguridad y la que permite cambiar con seguridad, y el resto se registra con un disparador. Medir antes de decidir cambió varias decisiones: el cálculo de costos mostró que los microservicios costaban unas veinte veces más que el monolito.

Éticas. Registré 40 hallazgos en las respuestas de la IA, desde campos inventados hasta un frontend que corría como root y comandos destructivos sin probar. Aprendí que los errores peligrosos no son los visibles, sino las omisiones: un código 403 que falta o un healthcheck opcional. También que la bitácora debe incluir un denominador y la gravedad de cada hallazgo, algo que no hice. Documenté con honestidad lo que no pude demostrar: no hay una URL pública, no grabé el video, no medí el efecto de la telemetría sobre la latencia y ningún usuario real ha usado el sistema.

Trabajo individual. Asumí todos los roles, lo que me obligó a priorizar y a dejar por escrito qué no hice. Sin revisor, la mayor protección fueron la integración continua, los escaneos y la costumbre de preguntarme qué evidencia sostenía cada afirmación.
