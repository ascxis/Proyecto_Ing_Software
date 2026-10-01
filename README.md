# TaskFlow - Sistema de Gestión de Tareas

Prototipo front-end del proyecto integrador de Ingeniería de Software I (Universidad de Pamplona).

# TaskFlow - Sistema de Gestión de Tareas

Prototipo front-end del proyecto integrador de Ingeniería de Software I (Universidad de Pamplona).

## Estado

Versión v0.1.0 - primer release del MVP: prototipo front-end sin backend.
La deuda técnica está registrada en los issues con la etiqueta deuda-tecnica (#4 a #9).

## Estructura del repositorio

- taskflow/: la aplicación (pagina.html).
- pruebas/: pruebas de caracterización y métricas.

## Cómo ejecutar las pruebas

Requisitos: Node.js 18 o superior. Desde la raíz del repositorio:

    node pruebas/snapshot_test.js taskflow/pagina.html --comparar taskflow/base.json

El resultado esperado termina en: Resultado: OK (37 pasos idénticos)

   ## Pruebas unitarias y de caja negra

   Requisitos: Node.js 20 o superior. Desde la raíz del repositorio:

       node --test pruebas/unitarias.test.js pruebas/caja_negra.test.js

   Resultado esperado: 64 pruebas, 63 pasan y 1 está pendiente (defecto D1, issue #12).
