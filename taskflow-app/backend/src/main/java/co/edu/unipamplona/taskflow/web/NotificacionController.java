package co.edu.unipamplona.taskflow.web;

import co.edu.unipamplona.taskflow.dto.Dto.NotificacionDto;
import co.edu.unipamplona.taskflow.service.NotificacionService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionController {
    private final NotificacionService notificaciones;
    public NotificacionController(NotificacionService notificaciones) { this.notificaciones = notificaciones; }

    @GetMapping
    public List<NotificacionDto> listar(Authentication a) { return notificaciones.deUsuario(Actual.id(a)); }

    @PostMapping("/{id}/leer")
    public NotificacionDto leer(Authentication a, @PathVariable String id) {
        try { return notificaciones.leer(Actual.id(a), Long.valueOf(id)); }
        catch (NumberFormatException e) { throw new ApiException(HttpStatus.NOT_FOUND, "No encontrada"); }
    }
}
