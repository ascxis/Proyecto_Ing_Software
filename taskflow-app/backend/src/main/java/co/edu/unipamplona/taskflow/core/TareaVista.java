package co.edu.unipamplona.taskflow.core;

/** Instantánea de una tarea tal como la necesita el núcleo (sin entidad JPA). */
public record TareaVista(long id, String titulo, Long asignadoId, String asignadoNombre,
                         long creadorProyectoId, EstadoTarea estado, long version) { }
