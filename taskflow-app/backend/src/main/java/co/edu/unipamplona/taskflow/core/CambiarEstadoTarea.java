package co.edu.unipamplona.taskflow.core;

import static co.edu.unipamplona.taskflow.core.ReglaNegocioException.Tipo.*;

/** Caso de uso (puerto de entrada): RN-02 solo el asignado cambia el estado; RN-05 avisar al creador; control de versión. */
public class CambiarEstadoTarea {
    private final TareaPuerto tareas;
    private final NotificadorPuerto notificador;

    public CambiarEstadoTarea(TareaPuerto tareas, NotificadorPuerto notificador) {
        this.tareas = tareas; this.notificador = notificador;
    }

    public TareaVista ejecutar(long usuarioId, long tareaId, String estadoTexto, Long versionCliente) {
        EstadoTarea nuevo = EstadoTarea.de(estadoTexto);
        TareaVista t = tareas.buscarVisiblePara(tareaId, usuarioId)
                .orElseThrow(() -> new ReglaNegocioException(NO_ENCONTRADA, "Tarea no encontrada"));
        if (t.asignadoId() == null || t.asignadoId() != usuarioId)
            throw new ReglaNegocioException(PROHIBIDO, "Solo el usuario asignado puede cambiar el estado de la tarea (RN-02)");
        if (versionCliente != null && versionCliente != t.version())
            throw new ReglaNegocioException(CONFLICTO, "La tarea fue modificada por otra persona; recarga e intenta de nuevo");
        if (t.estado() == nuevo) return t;                       // mismo estado: no notifica de nuevo
        TareaVista guardada = tareas.guardarEstado(tareaId, nuevo);
        if (t.creadorProyectoId() != usuarioId)
            notificador.avisar(t.creadorProyectoId(), t.asignadoNombre() + " cambió \"" + t.titulo() + "\" a " + nuevo.texto());
        return guardada;
    }
}
