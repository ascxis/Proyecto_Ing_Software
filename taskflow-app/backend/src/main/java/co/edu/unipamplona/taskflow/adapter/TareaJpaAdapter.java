package co.edu.unipamplona.taskflow.adapter;

import co.edu.unipamplona.taskflow.core.*;
import co.edu.unipamplona.taskflow.domain.Tarea;
import co.edu.unipamplona.taskflow.repo.MiembroRepository;
import co.edu.unipamplona.taskflow.repo.TareaRepository;
import java.util.Optional;
import org.springframework.stereotype.Component;

/** Adaptador de salida: implementa el puerto del núcleo con JPA. Aquí (y solo aquí) viven las entidades. */
@Component
public class TareaJpaAdapter implements TareaPuerto {
    private final TareaRepository tareas;
    private final MiembroRepository miembros;
    public TareaJpaAdapter(TareaRepository tareas, MiembroRepository miembros) { this.tareas = tareas; this.miembros = miembros; }

    @Override public Optional<TareaVista> buscarVisiblePara(long tareaId, long usuarioId) {
        return tareas.findById(tareaId)
                .filter(t -> miembros.existsByProyectoIdAndUsuarioId(t.getProyecto().getId(), usuarioId))
                .map(TareaJpaAdapter::vista);
    }

    @Override public TareaVista guardarEstado(long tareaId, EstadoTarea nuevo) {
        Tarea t = tareas.findById(tareaId).orElseThrow();
        t.setEstado(co.edu.unipamplona.taskflow.domain.Estado.valueOf(nuevo.name()));
        return vista(tareas.saveAndFlush(t));      // el flush dispara la comprobación de @Version
    }

    private static TareaVista vista(Tarea t) {
        return new TareaVista(t.getId(), t.getTitulo(),
                t.getAsignado() == null ? null : t.getAsignado().getId(),
                t.getAsignado() == null ? null : t.getAsignado().getNombre(),
                t.getProyecto().getCreador().getId(),
                EstadoTarea.valueOf(t.getEstado().name()), t.getVersion());
    }
}
