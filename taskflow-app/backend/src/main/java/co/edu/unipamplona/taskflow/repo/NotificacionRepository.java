package co.edu.unipamplona.taskflow.repo;

import co.edu.unipamplona.taskflow.domain.Notificacion;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {
    List<Notificacion> findTop20ByDestinatarioIdOrderByFechaDescIdDesc(Long destinatarioId);
}
