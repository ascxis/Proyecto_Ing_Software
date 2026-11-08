package co.edu.unipamplona.taskflow.core;

/** RN-10: porcentaje de avance de un proyecto. */
public final class Avance {
    private Avance() { }

    public static int porcentaje(long completadas, long total) {
        return total == 0 ? 0 : (int) Math.round(completadas * 100.0 / total);   // fase VERDE: lo mínimo que hace pasar las pruebas
    }
}
