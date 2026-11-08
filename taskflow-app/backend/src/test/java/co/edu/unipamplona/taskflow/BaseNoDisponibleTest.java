package co.edu.unipamplona.taskflow;

import static org.junit.jupiter.api.Assertions.*;

import co.edu.unipamplona.taskflow.web.ApiExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.transaction.CannotCreateTransactionException;

/** Postmortem de la guía 14: si la base de datos no responde, la API contesta 503 con un mensaje claro (no 500 ni detalles técnicos). */
class BaseNoDisponibleTest {
    private final ApiExceptionHandler manejador = new ApiExceptionHandler();

    @Test
    void fallaDeConexion_devuelve503_sinFiltrarDetallesTecnicos() {
        var r = manejador.baseNoDisponible(new CannotCreateTransactionException("jdbc:postgresql://db:5432/taskflow password=secreta"));
        assertEquals(503, r.getStatusCode().value());
        assertTrue(r.getBody().get("error").startsWith("Servicio temporalmente no disponible"));
        assertFalse(r.getBody().toString().contains("secreta"));
    }

    @Test
    void recursoDeDatosNoDisponible_devuelve503() {
        assertEquals(503, manejador.baseNoDisponible(new DataAccessResourceFailureException("sin conexión")).getStatusCode().value());
    }
}
