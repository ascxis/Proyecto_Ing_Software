package co.edu.unipamplona.taskflow.core;

/** Error de regla de negocio. No conoce HTTP: el adaptador web decide a qué código lo traduce. */
public class ReglaNegocioException extends RuntimeException {
    public enum Tipo { ENTRADA_INVALIDA, NO_ENCONTRADA, PROHIBIDO, CONFLICTO }
    private final Tipo tipo;
    public ReglaNegocioException(Tipo tipo, String mensaje) { super(mensaje); this.tipo = tipo; }
    public Tipo tipo() { return tipo; }
}
