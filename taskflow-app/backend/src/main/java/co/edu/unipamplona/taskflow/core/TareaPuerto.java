package co.edu.unipamplona.taskflow.core;

import java.util.Optional;

/** Puerto de salida: persistencia de tareas. Lo implementa un adaptador (JPA, memoria, etc.). */
public interface TareaPuerto {
    /** Devuelve la tarea solo si {@code usuarioId} es miembro de su proyecto. */
    Optional<TareaVista> buscarVisiblePara(long tareaId, long usuarioId);
    TareaVista guardarEstado(long tareaId, EstadoTarea nuevo);
}
