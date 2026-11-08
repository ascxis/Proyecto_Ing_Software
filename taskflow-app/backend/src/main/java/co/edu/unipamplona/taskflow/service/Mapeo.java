package co.edu.unipamplona.taskflow.service;

import co.edu.unipamplona.taskflow.domain.*;
import co.edu.unipamplona.taskflow.dto.Dto.*;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import co.edu.unipamplona.taskflow.web.ApiException;
import org.springframework.http.HttpStatus;

/** Conversión entre entidades y DTO (la interfaz usa ids como texto y fechas «aaaa-mm-dd» o vacío). */
final class Mapeo {
    private Mapeo() { }

    static UsuarioDto usuario(Usuario u) { return new UsuarioDto(String.valueOf(u.getId()), u.getNombre(), u.getCorreo(), u.getCargo()); }

    static TareaDto tarea(Tarea t) {
        return new TareaDto(String.valueOf(t.getId()), String.valueOf(t.getProyecto().getId()), t.getTitulo(), t.getDescripcion(),
                t.getPrioridad().name(), t.getEstado().name(), t.getAsignado() == null ? null : String.valueOf(t.getAsignado().getId()),
                t.getFechaLimite() == null ? "" : t.getFechaLimite().toString(), t.getVersion());
    }

    static NotificacionDto notificacion(Notificacion n) {
        return new NotificacionDto(String.valueOf(n.getId()), n.getMensaje(), n.getFecha().toEpochMilli(), n.isLeida());
    }

    static Long id(String texto) {
        try { return Long.valueOf(texto); }
        catch (NumberFormatException | NullPointerException e) { throw new ApiException(HttpStatus.NOT_FOUND, "No encontrado"); }
    }

    static LocalDate fecha(String texto) {
        if (texto == null || texto.isBlank()) return null;
        try { return LocalDate.parse(texto); }
        catch (DateTimeParseException e) { throw new ApiException(HttpStatus.BAD_REQUEST, "Fecha inválida (use aaaa-mm-dd)"); }
    }

    static Prioridad prioridad(String texto) {
        if (texto == null || texto.isBlank()) return Prioridad.MEDIA;
        try { return Prioridad.valueOf(texto); }
        catch (IllegalArgumentException e) { throw new ApiException(HttpStatus.BAD_REQUEST, "Prioridad inválida"); }
    }
}
