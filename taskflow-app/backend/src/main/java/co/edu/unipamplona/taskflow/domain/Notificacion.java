package co.edu.unipamplona.taskflow.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "notificaciones")
public class Notificacion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    /** Cada notificación tiene destinatario (corrige la deuda: antes eran globales). */
    @ManyToOne(optional = false)
    @JoinColumn(name = "destinatario_id")
    private Usuario destinatario;
    @Column(nullable = false, length = 500)
    private String mensaje;
    @Column(nullable = false)
    private Instant fecha = Instant.now();
    @Column(nullable = false)
    private boolean leida = false;

    protected Notificacion() { }
    public Notificacion(Usuario destinatario, String mensaje) { this.destinatario = destinatario; this.mensaje = mensaje; }
    public Long getId() { return id; }
    public Usuario getDestinatario() { return destinatario; }
    public String getMensaje() { return mensaje; }
    public Instant getFecha() { return fecha; }
    public boolean isLeida() { return leida; }
    public void marcarLeida() { this.leida = true; }
}
