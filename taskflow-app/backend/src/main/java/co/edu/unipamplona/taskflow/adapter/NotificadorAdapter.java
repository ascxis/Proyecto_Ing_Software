package co.edu.unipamplona.taskflow.adapter;

import co.edu.unipamplona.taskflow.core.NotificadorPuerto;
import co.edu.unipamplona.taskflow.repo.UsuarioRepository;
import co.edu.unipamplona.taskflow.service.NotificacionService;
import org.springframework.stereotype.Component;

/** Adaptador de salida: el aviso del núcleo se materializa como una fila en la tabla de notificaciones. */
@Component
public class NotificadorAdapter implements NotificadorPuerto {
    private final UsuarioRepository usuarios;
    private final NotificacionService notificaciones;
    public NotificadorAdapter(UsuarioRepository usuarios, NotificacionService notificaciones) { this.usuarios = usuarios; this.notificaciones = notificaciones; }

    @Override public void avisar(long destinatarioId, String mensaje) {
        usuarios.findById(destinatarioId).ifPresent(u -> notificaciones.crear(u, mensaje));
    }
}
