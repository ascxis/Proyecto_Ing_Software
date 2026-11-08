package co.edu.unipamplona.taskflow.core;

public enum EstadoTarea {
    PENDIENTE("pendiente"), EN_PROCESO("en proceso"), COMPLETADA("completada");
    private final String texto;
    EstadoTarea(String texto) { this.texto = texto; }
    /** Texto para mensajes al usuario (minúsculas, en español). */
    public String texto() { return texto; }

    public static EstadoTarea de(String texto) {
        try { return EstadoTarea.valueOf(texto); }
        catch (IllegalArgumentException | NullPointerException e) {
            throw new ReglaNegocioException(ReglaNegocioException.Tipo.ENTRADA_INVALIDA, "Estado inválido");
        }
    }
}
