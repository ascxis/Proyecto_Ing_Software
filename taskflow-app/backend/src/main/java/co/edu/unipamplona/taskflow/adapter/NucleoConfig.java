package co.edu.unipamplona.taskflow.adapter;

import co.edu.unipamplona.taskflow.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Composición: el núcleo no usa anotaciones de Spring; aquí se cablea con sus adaptadores. */
@Configuration
public class NucleoConfig {
    @Bean public CambiarEstadoTarea cambiarEstadoTarea(TareaPuerto tareas, NotificadorPuerto notificador) { return new CambiarEstadoTarea(tareas, notificador); }
}
