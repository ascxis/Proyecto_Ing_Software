package co.edu.unipamplona.taskflow.repo;

import co.edu.unipamplona.taskflow.domain.Estado;
import co.edu.unipamplona.taskflow.domain.Tarea;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TareaRepository extends JpaRepository<Tarea, Long> {
    List<Tarea> findByProyectoId(Long proyectoId);
    List<Tarea> findByProyectoIdAndAsignadoId(Long proyectoId, Long asignadoId);
    long countByProyectoId(Long proyectoId);
    long countByProyectoIdAndEstado(Long proyectoId, Estado estado);
    boolean existsByProyectoIdAndEstadoNot(Long proyectoId, Estado estado);
    void deleteByProyectoId(Long proyectoId);

    @Query("select t from Tarea t where t.proyecto.id in (select m.proyecto.id from MiembroProyecto m where m.usuario.id = :uid) order by t.id")
    List<Tarea> deUsuario(@Param("uid") Long uid);
}
