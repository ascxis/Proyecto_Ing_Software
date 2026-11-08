package co.edu.unipamplona.taskflow;

import co.edu.unipamplona.taskflow.domain.*;
import co.edu.unipamplona.taskflow.repo.*;
import java.time.LocalDate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Carga datos de demostración la primera vez (SEED=true). Las contraseñas se guardan con hash BCrypt. */
@Component
public class DatosDemo implements CommandLineRunner {
    private final UsuarioRepository usuarios; private final ProyectoRepository proyectos; private final TareaRepository tareas;
    private final PasswordEncoder encoder; private final boolean activo;

    public DatosDemo(UsuarioRepository usuarios, ProyectoRepository proyectos, TareaRepository tareas, PasswordEncoder encoder,
                     @Value("${taskflow.seed:false}") boolean activo) {
        this.usuarios = usuarios; this.proyectos = proyectos; this.tareas = tareas; this.encoder = encoder; this.activo = activo;
    }

    @Override @Transactional
    public void run(String... args) {
        if (!activo || usuarios.count() > 0) return;
        Usuario admin = usuarios.save(new Usuario("Administrador", "admin@gmail.com", encoder.encode("admin123"), "Project Manager"));
        Usuario ronald = usuarios.save(new Usuario("Ronald Alexander Sandoval", "ronald@unipamplona.edu.co", encoder.encode("1234abcd"), "Desarrollador"));
        Usuario juan = usuarios.save(new Usuario("Juan Miguel Beltrán", "juan@unipamplona.edu.co", encoder.encode("1234abcd"), "Diseñador"));

        Proyecto p1 = new Proyecto("Sistema Web Universidad", "Plataforma de gestión académica para la Universidad de Pamplona", LocalDate.of(2026, 12, 14), admin);
        p1.agregarMiembro(admin, RolProyecto.CREADOR); p1.agregarMiembro(ronald, RolProyecto.MIEMBRO); p1.agregarMiembro(juan, RolProyecto.MIEMBRO);
        proyectos.save(p1);
        Proyecto p2 = new Proyecto("App Móvil de Tareas", "Aplicación para seguimiento de tareas del semillero", LocalDate.of(2026, 11, 30), admin);
        p2.agregarMiembro(admin, RolProyecto.CREADOR); p2.agregarMiembro(juan, RolProyecto.MIEMBRO);
        proyectos.save(p2);

        tareas.save(nueva(p1, "Diseñar interfaz de login", "Crear mockups del módulo de autenticación", Prioridad.ALTA, Estado.COMPLETADA, juan, "2026-10-01"));
        tareas.save(nueva(p1, "Implementar base de datos", "Configurar PostgreSQL y crear esquemas", Prioridad.ALTA, Estado.EN_PROCESO, ronald, "2026-11-15"));
        tareas.save(nueva(p1, "Desarrollar módulo de proyectos", "CRUD completo de proyectos", Prioridad.MEDIA, Estado.PENDIENTE, ronald, "2026-11-25"));
        tareas.save(nueva(p1, "Pruebas de usabilidad", "Realizar tests con usuarios reales", Prioridad.BAJA, Estado.PENDIENTE, admin, "2026-12-10"));
        tareas.save(nueva(p2, "Wireframes de la app", "Diseñar flujo principal de la aplicación", Prioridad.ALTA, Estado.EN_PROCESO, juan, "2026-11-20"));
        tareas.save(nueva(p2, "Configurar React Native", "Inicializar proyecto y dependencias", Prioridad.MEDIA, Estado.COMPLETADA, juan, "2026-10-25"));
    }

    private static Tarea nueva(Proyecto p, String t, String d, Prioridad pr, Estado e, Usuario a, String f) {
        Tarea x = new Tarea(p, t, d, pr, LocalDate.parse(f), a); x.setEstado(e); return x;
    }
}
