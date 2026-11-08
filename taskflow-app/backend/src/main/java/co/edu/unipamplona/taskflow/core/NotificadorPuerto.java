package co.edu.unipamplona.taskflow.core;

/** Puerto de salida: aviso al creador del proyecto (RN-05). */
public interface NotificadorPuerto {
    void avisar(long destinatarioId, String mensaje);
}
