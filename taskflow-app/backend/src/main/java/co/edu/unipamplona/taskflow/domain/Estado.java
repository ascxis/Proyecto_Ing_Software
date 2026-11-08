package co.edu.unipamplona.taskflow.domain;

/** Estados de una tarea. Las transiciones entre los tres son libres (RN-09). */
public enum Estado {
    PENDIENTE("pendiente"), EN_PROCESO("en proceso"), COMPLETADA("completada");

    private final String texto;
    Estado(String texto) { this.texto = texto; }
    public String texto() { return texto; }
}
