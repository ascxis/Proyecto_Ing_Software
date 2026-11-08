package co.edu.unipamplona.taskflow.demo;

/** DEMOSTRACIÓN: código nuevo sin pruebas para comprobar que el Quality Gate bloquea la fusión. No se fusiona. */
public final class Tarifa {
    private Tarifa() { }

    public static int calcular(int horas, String nivel, boolean urgente, boolean festivo) {
        int base;
        if (horas <= 0) { return 0; }
        switch (nivel) {
            case "BASICO": base = 10; break;
            case "MEDIO": base = 20; break;
            case "ALTO": base = 35; break;
            default: base = 50; break;
        }
        int total = base * horas;
        if (urgente) { total += total / 2; }
        if (festivo) { total += total / 4; }
        if (horas > 40) { total -= total / 10; }
        if (horas > 80) { total -= total / 20; }
        if ("ALTO".equals(nivel) && urgente && festivo) { total += 100; }
        if ("BASICO".equals(nivel) && !urgente && !festivo && horas > 20) { total -= 5; }
        return total;
    }

    public static String etiqueta(int total) {
        if (total < 100) { return "bajo"; }
        if (total < 500) { return "medio"; }
        if (total < 1000) { return "alto"; }
        return "muy alto";
    }
}
