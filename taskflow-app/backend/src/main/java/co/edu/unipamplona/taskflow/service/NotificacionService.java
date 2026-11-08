package co.edu.unipamplona.taskflow.service;

import co.edu.unipamplona.taskflow.domain.Notificacion;
import co.edu.unipamplona.taskflow.domain.Usuario;
import co.edu.unipamplona.taskflow.dto.Dto.NotificacionDto;
import co.edu.unipamplona.taskflow.repo.NotificacionRepository;
import co.edu.unipamplona.taskflow.web.ApiException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificacionService {
    private final NotificacionRepository repo;
    public NotificacionService(NotificacionRepository repo) { this.repo = repo; }

    /** RN-05: toda asignación o cambio de estado deja una notificación sin leer para su destinatario. */
    public void crear(Usuario destinatario, String mensaje) { repo.save(new Notificacion(destinatario, mensaje)); }

    @Transactional(readOnly = true)
    public List<NotificacionDto> deUsuario(Long uid) {
        return repo.findTop20ByDestinatarioIdOrderByFechaDescIdDesc(uid).stream().map(Mapeo::notificacion).toList();
    }

    @Transactional
    public NotificacionDto leer(Long uid, Long id) {
        Notificacion n = repo.findById(id).filter(x -> x.getDestinatario().getId().equals(uid))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No encontrada"));
        n.marcarLeida();
        return Mapeo.notificacion(n);
    }
}
