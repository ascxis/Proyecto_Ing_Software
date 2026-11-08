package co.edu.unipamplona.taskflow.service;

import co.edu.unipamplona.taskflow.core.Avance;
import co.edu.unipamplona.taskflow.domain.*;
import co.edu.unipamplona.taskflow.dto.Dto.*;
import co.edu.unipamplona.taskflow.repo.*;
import co.edu.unipamplona.taskflow.web.ApiException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProyectoService {
    private final ProyectoRepository proyectos;
    private final MiembroRepository miembros;
    private final UsuarioRepository usuarios;
    private final TareaRepository tareas;
    private final NotificacionService notificaciones;

    public ProyectoService(ProyectoRepository proyectos, MiembroRepository miembros, UsuarioRepository usuarios,
                           TareaRepository tareas, NotificacionService notificaciones) {
        this.proyectos = proyectos; this.miembros = miembros; this.usuarios = usuarios; this.tareas = tareas; this.notificaciones = notificaciones;
    }

    ProyectoDto dto(Proyecto p) {
        long total = tareas.countByProyectoId(p.getId());
        long ok = tareas.countByProyectoIdAndEstado(p.getId(), Estado.COMPLETADA);
        List<MiembroDto> ms = p.getMiembros().stream()
                .map(m -> new MiembroDto(String.valueOf(m.getUsuario().getId()), m.getUsuario().getNombre(), m.getRol().name())).toList();
        int avance = Avance.porcentaje(ok, total);   // RN-10, regla única y probada en el núcleo
        return new ProyectoDto(String.valueOf(p.getId()), p.getNombre(), p.getDescripcion(),
                p.getFechaLimite() == null ? "" : p.getFechaLimite().toString(), String.valueOf(p.getCreador().getId()), ms, total, ok, avance);
    }

    /** Devuelve el proyecto solo si el usuario es miembro; en caso contrario 404 o 403. */
    Proyecto cargar(Long pid, Long uid) {
        Proyecto p = proyectos.findById(pid).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Proyecto no encontrado"));
        if (!miembros.existsByProyectoIdAndUsuarioId(pid, uid)) throw new ApiException(HttpStatus.FORBIDDEN, "No perteneces a este proyecto");
        return p;
    }

    private void exigirCreador(Proyecto p, Long uid, String accion) {
        if (!p.getCreador().getId().equals(uid)) throw new ApiException(HttpStatus.FORBIDDEN, "Solo el creador " + accion);
    }

    @Transactional(readOnly = true)
    public List<ProyectoDto> deUsuario(Long uid) {
        return miembros.findByUsuarioId(uid).stream().map(m -> dto(m.getProyecto())).toList();
    }

    @Transactional(readOnly = true)
    public ProyectoDto obtener(Long uid, Long pid) { return dto(cargar(pid, uid)); }

    @Transactional
    public ProyectoDto crear(Long uid, ProyectoReq r) {
        if (r.nombre() == null || r.nombre().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "El nombre es obligatorio");
        Usuario creador = usuarios.findById(uid).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "No autenticado"));
        Proyecto p = new Proyecto(r.nombre(), r.descripcion(), Mapeo.fecha(r.fechaLimite()), creador);
        p.agregarMiembro(creador, RolProyecto.CREADOR);                       // RN-06: el creador siempre es miembro
        Set<Long> otros = new LinkedHashSet<>();
        if (r.miembrosIds() != null) r.miembrosIds().forEach(s -> otros.add(Mapeo.id(s)));
        otros.remove(uid);
        for (Long id : otros) usuarios.findById(id).ifPresent(u -> p.agregarMiembro(u, RolProyecto.MIEMBRO));
        return dto(proyectos.save(p));
    }

    /** RN-04: no se elimina un proyecto con tareas sin completar. */
    @Transactional
    public void eliminar(Long uid, Long pid) {
        Proyecto p = cargar(pid, uid);
        exigirCreador(p, uid, "puede eliminar el proyecto");
        if (tareas.existsByProyectoIdAndEstadoNot(pid, Estado.COMPLETADA))
            throw new ApiException(HttpStatus.CONFLICT, "No se puede eliminar un proyecto con tareas sin completar (RN-04)");
        tareas.deleteByProyectoId(pid);
        proyectos.delete(p);
    }

    @Transactional
    public ProyectoDto agregarMiembro(Long uid, Long pid, Long nuevoId) {
        Proyecto p = cargar(pid, uid);
        exigirCreador(p, uid, "gestiona miembros");
        Usuario u = usuarios.findById(nuevoId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        if (!p.tieneMiembro(nuevoId)) {
            p.agregarMiembro(u, RolProyecto.MIEMBRO);
            notificaciones.crear(u, "Fuiste añadido al proyecto " + p.getNombre());
        }
        return dto(p);
    }

    @Transactional
    public ProyectoDto quitarMiembro(Long uid, Long pid, Long quitarId) {
        Proyecto p = cargar(pid, uid);
        exigirCreador(p, uid, "gestiona miembros");
        if (p.getCreador().getId().equals(quitarId)) throw new ApiException(HttpStatus.BAD_REQUEST, "No se puede quitar al creador (RN-06)");
        p.getMiembros().removeIf(m -> m.getUsuario().getId().equals(quitarId));
        tareas.findByProyectoIdAndAsignadoId(pid, quitarId).forEach(t -> t.setAsignado(null));   // sus tareas quedan sin asignar
        return dto(p);
    }
}
