package co.edu.unipamplona.taskflow.web;

import org.springframework.http.HttpStatus;

/** Error de negocio con el código HTTP que corresponde (400, 401, 403, 404, 409). */
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    public ApiException(HttpStatus status, String mensaje) { super(mensaje); this.status = status; }
    public HttpStatus getStatus() { return status; }
}
