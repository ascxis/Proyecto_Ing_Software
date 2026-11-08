package co.edu.unipamplona.taskflow.service;

import co.edu.unipamplona.taskflow.core.CambiarEstadoTarea;
import co.edu.unipamplona.taskflow.core.ReglaNegocioException;
import co.edu.unipamplona.taskflow.domain.*;
import co.edu.unipamplona.taskflow.dto.Dto.*;
import co.edu.unipamplona.taskflow.repo.*;
import co.edu.unipamplona.taskflow.web.ApiException;
import java.util.List;
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

    public TareaService(TareaRepository tareas, ProyectoService proyectos, MiembroRepository miembros,
                        UsuarioRepository usuarios, NotificacionService notificaciones, CambiarEstadoTarea casoCambiarEstado) {
        this.tareas = tareas; this.proyectos = proyectos; this.miembros = miembros; this.usuarios = usuarios; this.notificaciones = notificaciones; this.casoCambiarEstado = casoCambiarEstado;
    }

    @Transactional(readOnly = true)
    public List<TareaDto> deUsuario(Long uid) { return tareas.deUsuario(uid).stream().map(Mapeo::tarea).toList(); }

    private Usuario asignable(Proyecto p, String asignadoId) {
        if (asignadoId == null || asignadoId.isBlank()) return null;
        Long id = Mapeo.id(asignadoId);
        if (!p.tieneMiembro(id)) throw new ApiException(HttpStatus.BAD_REQUEST, "Solo se puede asignar a un miembro del proyecto (RN-01)");
        return usuarios.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    @Transactional
    public TareaDto crear(Long uid, Long pid, TareaReq r) {
        Proyecto p = proyectos.cargar(pid, uid);
        if (r.titulo() == null || r.titulo().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "El título es obligatorio");
        Usuario asignado = asignable(p, r.asignadoId());
        Tarea t = tareas.save(new Tarea(p, r.titulo(), r.descripcion(), Mapeo.prioridad(r.prioridad()), Mapeo.fecha(r.fechaLimite()), asignado));
        if (asignado != null) notificaciones.crear(asignado, "Se te asignó la tarea \"" + t.getTitulo() + "\" en " + p.getNombre());
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
    @Transactional
    public TareaDto cambiarEstado(Long uid, Long tid, EstadoReq r) {
        try { casoCambiarEstado.ejecutar(uid, tid, r.estado(), r.version()); }
        catch (ReglaNegocioException e) { throw new ApiException(http(e.tipo()), e.getMessage()); }
        return Mapeo.tarea(cargar(tid, uid));
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
        if (!p.getCreador().getId().equals(uid)) throw new ApiException(HttpStatus.FORBIDDEN, "Solo el creador del proyecto puede editar tareas");
        Long anterior = t.getAsignado() == null ? null : t.getAsignado().getId();
        Usuario nuevo = r.asignadoId() == null ? t.getAsignado() : asignable(p, r.asignadoId());   // "" quita la asignación
        t.actualizar(r.titulo(), r.descripcion(), r.prioridad() == null ? null : Mapeo.prioridad(r.prioridad()), Mapeo.fecha(r.fechaLimite()));
        t.setAsignado(nuevo);
        if (nuevo != null && !nuevo.getId().equals(anterior))
            notificaciones.crear(nuevo, "Se te asignó la tarea \"" + t.getTitulo() + "\" en " + p.getNombre());
        return Mapeo.tarea(tareas.saveAndFlush(t));
    }

    @Transactional
    public void eliminar(Long uid, Long tid) {
        Tarea t = cargar(tid, uid);
        if (!t.getProyecto().getCreador().getId().equals(uid)) throw new ApiException(HttpStatus.FORBIDDEN, "Solo el creador del proyecto puede eliminar tareas");
        tareas.delete(t);
    }
}
