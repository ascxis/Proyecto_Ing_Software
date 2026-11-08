# TaskFlow – Sistema de Gestión de Tareas

Aplicación web para que un semillero de investigación organice proyectos, asigne tareas a sus miembros y vea el avance.
Proyecto individual de Ingeniería de Software II – Universidad de Pamplona.

| Capa | Tecnología |
|---|---|
| Interfaz | React 18 + TypeScript + Tailwind CSS |
| API | REST (JSON) con autenticación JWT |
| Lógica de negocio | Spring Boot 3 (Java 21), monolito en capas: controlador → servicio → repositorio |
| Datos | PostgreSQL 16 con JPA/Hibernate |
| Despliegue | Docker y docker compose |

## Ejecutar con Docker
```bash
docker compose up --build
# interfaz en http://localhost:3000   (usuario de prueba: admin@gmail.com / admin123)
```

## Ejecutar por separado
```bash
# Backend (requiere PostgreSQL en localhost:5432, base y usuario "taskflow")
cd backend && mvn spring-boot:run

# Interfaz con servidor de desarrollo que imita la API (sin base de datos)
cd frontend && npm install && npm run dev      # http://localhost:8080
```

## Pruebas
```bash
cd backend  && mvn test             # JUnit: reglas de negocio contra la API (H2 en memoria)
cd frontend && npm run test:e2e     # Chromium: interfaz + API (14 casos)
```

## Reglas de negocio implementadas
RN-01 asignar solo a miembros · RN-02 solo el asignado cambia el estado · RN-04 no eliminar proyectos con tareas sin completar ·
RN-05 notificar asignaciones y cambios de estado a su destinatario · RN-06 el creador siempre es miembro ·
RN-08 correo único y contraseña de 6+ caracteres (se guarda con BCrypt) · RN-09 transiciones libres entre estados ·
RN-10 avance = tareas completadas / total · concurrencia con `@Version` (409 si la versión es obsoleta).

## Estado conocido
- `ddl-auto: update` crea las tablas automáticamente; falta introducir migraciones versionadas (Flyway).
- La interfaz aún no es responsiva para móvil.
- Sin pruebas de carga ni piloto con usuarios reales.
