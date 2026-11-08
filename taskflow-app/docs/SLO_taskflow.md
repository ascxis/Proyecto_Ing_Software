# SLI, SLO y presupuesto de error — TaskFlow

## SLI (indicadores)
| SLI | Definición | Cómo se mide |
|---|---|---|
| Disponibilidad | Peticiones a la API que **no** terminan en 5xx ÷ peticiones totales (los 4xx son rechazos de negocio, no fallos del servicio) | `1 - sum(rate(http_server_requests_seconds_count{status=~"5.."}[30d])) / sum(rate(http_server_requests_seconds_count[30d]))` en Prometheus |
| Latencia | Fracción de peticiones a `PATCH /api/tareas/{id}/estado` que responden en menos de 800 ms | `histogram_quantile(0.95, …)` del panel de Grafana (guía 13) |

## SLO acordado
| SLI | SLO (ventana de 30 días) | Presupuesto de error |
|---|---|---|
| Disponibilidad | **99 %** (el valor ya fijado en la FPI-18, escenario S-4) | 1 % = **7,2 h = 432 min** al mes |
| Latencia | p95 < 800 ms (umbral de S-4 y de la prueba k6) | 5 % de las peticiones pueden superarlo |

> Honestidad: no hay usuarios reales ni acuerdo comercial firmado; el 99 % es el supuesto de diseño del proyecto, no un contrato. El SLO se revisaría con datos de uso reales.

## Ejercicio: presupuesto de error de 99,5 % frente a 99,95 % (mes de 30 días = 720 h)
| SLO | Presupuesto | Horas/mes | Minutos/mes |
|---|---|---|---|
| 99 % | 1 % | 7,2 h | 432 min |
| 99,5 % | 0,5 % | **3,6 h** | 216 min |
| 99,95 % | 0,05 % | **0,36 h** | 21,6 min |

Pasar de 99,5 % a 99,95 % divide el margen entre 10: de 3,6 h a 21,6 min. Con un solo contenedor y recuperación manual, el simulacro tardó unos 63 s en recuperarse (con la persona ya atenta), de modo que 21,6 min sólo aguantan unos 20 incidentes de ese tamaño y ninguna demora humana real (un fallo nocturno consumiría el presupuesto completo).

## Política del presupuesto
Si el consumo del mes supera el 100 %: se congelan las funcionalidades nuevas y se dedica el tiempo a estabilizar (ver `postmortems/`). Al 50 % se revisa en la reunión semanal.
