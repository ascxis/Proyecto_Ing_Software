package co.edu.unipamplona.taskflow.dto;

import java.util.List;

/** Objetos de transferencia de la API REST. Los identificadores viajan como texto, como espera la interfaz. */
public final class Dto {
    private Dto() { }

    public record UsuarioDto(String id, String nombre, String correo, String cargo) { }
    public record SesionDto(String token, UsuarioDto usuario) { }
    public record LoginReq(String correo, String clave) { }
    public record RegistroReq(String nombre, String correo, String clave) { }

    public record MiembroDto(String usuarioId, String nombre, String rol) { }
    public record ProyectoDto(String id, String nombre, String descripcion, String fechaLimite, String creadorId,
                              List<MiembroDto> miembros, long totalTareas, long completadas, int avance) { }
    public record ProyectoReq(String nombre, String descripcion, String fechaLimite, List<String> miembrosIds) { }
    public record MiembroReq(String usuarioId) { }

    public record TareaDto(String id, String proyectoId, String titulo, String descripcion, String prioridad, String estado,
                           String asignadoId, String fechaLimite, long version) { }
    public record TareaReq(String titulo, String descripcion, String prioridad, String fechaLimite, String asignadoId) { }
    public record EstadoReq(String estado, Long version) { }

    public record NotificacionDto(String id, String mensaje, long fecha, boolean leida) { }
}
