package co.edu.unipamplona.taskflow.service;

import co.edu.unipamplona.taskflow.core.CambiarEstadoTarea;
import co.edu.unipamplona.taskflow.core.ReglaNegocioException;
import co.edu.unipamplona.taskflow.domain.*;
import co.edu.unipamplona.taskflow.dto.Dto.*;
import co.edu.unipamplona.taskflow.repo.*;
import co.edu.unipamplona.taskflow.web.ApiException;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationRegistry;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TareaService {
    private final TareaRepository tareas;
    private final ProyectoService proyectos;
    private final MiembroRepository miembros;
    private final UsuarioRepository usuarios;
    private final NotificacionService notificaciones;
    private final CambiarEstadoTarea casoCambiarEstado;
    private final ObservationRegistry observaciones;
    private final MeterRegistry metricas;
    private static final Logger LOG = LoggerFactory.getLogger(TareaService.class);

    public TareaService(TareaRepository tareas, ProyectoService proyectos, MiembroRepository miembros,
                        UsuarioRepository usuarios, NotificacionService notificaciones, CambiarEstadoTarea casoCambiarEstado,
                        ObservationRegistry observaciones, MeterRegistry metricas) {
        this.tareas = tareas; this.proyectos = proyectos; this.miembros = miembros; this.usuarios = usuarios; this.notificaciones = notificaciones; this.casoCambiarEstado = casoCambiarEstado;
        this.observaciones = observaciones; this.metricas = metricas;
    }

    @Transactional(readOnly = true)
    public List<TareaDto> deUsuario(Long uid) { return tareas.deUsuario(uid).stream().map(Mapeo::tarea).toList(); }

    private Usuario asignable(Proyecto p, String asignadoId) {
        if (asignadoId == null || asignadoId.isBlank()) return null;
        Long id = Mapeo.id(asignadoId);
        if (!p.tieneMiembro(id)) throw new ApiException(HttpStatus.BAD_REQUEST, "Solo se puede asignar a un miembro del proyecto (RN-01)");
        return usuarios.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    // Helpers privados (refactor preventivo, guía 15): sin @Transactional; se ejecutan dentro de la transacción del método público.
    private static void exigirTitulo(String titulo) {
        if (titulo == null || titulo.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "El título es obligatorio");
    }

    private static void exigirCreador(Proyecto p, Long uid, String accion) {
        if (!p.getCreador().getId().equals(uid)) throw new ApiException(HttpStatus.FORBIDDEN, "Solo el creador del proyecto puede " + accion + " tareas");
    }

    private void notificarAsignacion(Usuario destino, Tarea t, Proyecto p) {
        notificaciones.crear(destino, "Se te asignó la tarea \"" + t.getTitulo() + "\" en " + p.getNombre());
    }

    @Transactional
    public TareaDto crear(Long uid, Long pid, TareaReq r) {
        Proyecto p = proyectos.cargar(pid, uid);
        exigirTitulo(r.titulo());
        Usuario asignado = asignable(p, r.asignadoId());
        Tarea t = tareas.save(new Tarea(p, r.titulo(), r.descripcion(), Mapeo.prioridad(r.prioridad()), Mapeo.fecha(r.fechaLimite()), asignado));
        if (asignado != null) notificarAsignacion(asignado, t, p);
        return Mapeo.tarea(t);
    }

    private Tarea cargar(Long tid, Long uid) {
        Tarea t = tareas.findById(tid).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tarea no encontrada"));
        if (!miembros.existsByProyectoIdAndUsuarioId(t.getProyecto().getId(), uid)) throw new ApiException(HttpStatus.NOT_FOUND, "Tarea no encontrada");
        return t;
    }

    /**
     * Delegado al núcleo hexagonal (core.CambiarEstadoTarea): RN-02, RN-05, RN-09 y control de versión viven allí,
     * sin dependencias de Spring/JPA. Este método solo traduce los errores de negocio a códigos HTTP.
     */
    /**
     * Endpoint crítico instrumentado (guía 13). Una sola Observation de Micrometer produce:
     *  - un SPAN OpenTelemetry «taskflow.tarea.cambiar_estado» (si la traza es muestreada),
     *  - una MÉTRICA de duración (Timer) con el mismo nombre, más un contador taskflow_cambios_estado por resultado,
     *  - un LOG estructurado (JSON) con traceId/spanId, sin datos personales: solo ids numéricos y el estado destino.
     * Nunca se registran nombres, correos ni títulos de tareas (Ley 1581 de 2012).
     */
    @Transactional
    public TareaDto cambiarEstado(Long uid, Long tid, EstadoReq r) {
        Observation obs = Observation.createNotStarted("taskflow.tarea.cambiar_estado", observaciones)
                .lowCardinalityKeyValue("estado.destino", estadoConocido(r.estado()));   // etiqueta acotada: nunca texto libre
        return obs.observe(() -> {
            try {
                casoCambiarEstado.ejecutar(uid, tid, r.estado(), r.version());
                contar("ok", r.estado());
                LOG.atInfo().addKeyValue("tareaId", tid).addKeyValue("estadoDestino", estadoConocido(r.estado()))
                        .addKeyValue("resultado", "ok").log("estado de tarea cambiado");
            } catch (ReglaNegocioException e) {
                contar(e.tipo().name().toLowerCase(), r.estado());
                LOG.atWarn().addKeyValue("tareaId", tid).addKeyValue("estadoDestino", estadoConocido(r.estado()))
                        .addKeyValue("resultado", e.tipo().name().toLowerCase()).log("cambio de estado rechazado");
                throw new ApiException(http(e.tipo()), e.getMessage());
            }
            return Mapeo.tarea(cargar(tid, uid));
        });
    }

    private void contar(String resultado, String estado) {
        metricas.counter("taskflow.cambios.estado", "resultado", resultado, "estado", estadoConocido(estado)).increment();
    }

    private static String estadoConocido(String estado) {
        try { return co.edu.unipamplona.taskflow.core.EstadoTarea.valueOf(estado).name(); }
        catch (IllegalArgumentException | NullPointerException e) { return "INVALIDO"; }
    }

    private static HttpStatus http(ReglaNegocioException.Tipo t) {
        return switch (t) {
            case ENTRADA_INVALIDA -> HttpStatus.BAD_REQUEST;
            case NO_ENCONTRADA -> HttpStatus.NOT_FOUND;
            case PROHIBIDO -> HttpStatus.FORBIDDEN;
            case CONFLICTO -> HttpStatus.CONFLICT;
        };
    }

    @Transactional
    public TareaDto editar(Long uid, Long tid, TareaReq r) {
        Tarea t = cargar(tid, uid);
        Proyecto p = t.getProyecto();
        exigirCreador(p, uid, "editar");
        if (r.titulo() != null) exigirTitulo(r.titulo());   // N6: un título en blanco tampoco se acepta al editar
        Long anterior = t.getAsignado() == null ? null : t.getAsignado().getId();
        Usuario nuevo = r.asignadoId() == null ? t.getAsignado() : asignable(p, r.asignadoId());   // "" quita la asignación
        t.actualizar(r.titulo(), r.descripcion(), r.prioridad() == null ? null : Mapeo.prioridad(r.prioridad()), r.fechaLimite() == null ? t.getFechaLimite() : Mapeo.fecha(r.fechaLimite()));   // N7: ausente = conservar; "" = quitar
        t.setAsignado(nuevo);
        if (nuevo != null && !nuevo.getId().equals(anterior)) notificarAsignacion(nuevo, t, p);
        return Mapeo.tarea(tareas.saveAndFlush(t));
    }

    @Transactional
    public void eliminar(Long uid, Long tid) {
        Tarea t = cargar(tid, uid);
        exigirCreador(t.getProyecto(), uid, "eliminar");
        tareas.delete(t);
    }
}
