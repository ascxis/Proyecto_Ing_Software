package co.edu.unipamplona.taskflow.repo;

import co.edu.unipamplona.taskflow.domain.MiembroProyecto;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MiembroRepository extends JpaRepository<MiembroProyecto, Long> {
    boolean existsByProyectoIdAndUsuarioId(Long proyectoId, Long usuarioId);
    List<MiembroProyecto> findByUsuarioId(Long usuarioId);
}
