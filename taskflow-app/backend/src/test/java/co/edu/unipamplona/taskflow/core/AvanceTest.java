package co.edu.unipamplona.taskflow.core;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/** RN-10: el avance de un proyecto es el porcentaje de tareas completadas, redondeado al entero más cercano. */
class AvanceTest {
    @Test void sinTareas_esCero() { assertEquals(0, Avance.porcentaje(0, 0)); }
    @Test void unaDeTres_es33() { assertEquals(33, Avance.porcentaje(1, 3)); }
    @Test void dosDeTres_es67() { assertEquals(67, Avance.porcentaje(2, 3)); }
    @Test void todasCompletadas_es100() { assertEquals(100, Avance.porcentaje(5, 5)); }
    @Test void mitadExacta_redondeaHaciaArriba() { assertEquals(13, Avance.porcentaje(1, 8)); }   // 12,5 -> 13
}
