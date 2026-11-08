package co.edu.unipamplona.taskflow.core;

public enum EstadoTarea { PENDIENTE, EN_PROCESO, COMPLETADA;
    public static EstadoTarea de(String texto) {
        try { return EstadoTarea.valueOf(texto); }
        catch (IllegalArgumentException | NullPointerException e) {
            throw new ReglaNegocioException(ReglaNegocioException.Tipo.ENTRADA_INVALIDA, "Estado inválido");
        }
    }
}
