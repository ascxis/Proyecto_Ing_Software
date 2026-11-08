package co.edu.unipamplona.taskflow.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "tareas")
public class Tarea {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false)
    @JoinColumn(name = "proyecto_id")
    private Proyecto proyecto;
    @Column(nullable = false)
    private String titulo;
    @Column(length = 1000)
    private String descripcion;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Prioridad prioridad = Prioridad.MEDIA;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Estado estado = Estado.PENDIENTE;
    @ManyToOne
    @JoinColumn(name = "asignado_id")
    private Usuario asignado;
    @Column(name = "fecha_limite")
    private LocalDate fechaLimite;
    @Column(name = "creada_en", nullable = false)
    private Instant creadaEn = Instant.now();
    /** Control optimista de concurrencia: dos escrituras sobre la misma versión no pueden coexistir. */
    @Version
    private Long version;

    protected Tarea() { }
    public Tarea(Proyecto proyecto, String titulo, String descripcion, Prioridad prioridad, LocalDate fechaLimite, Usuario asignado) {
        this.proyecto = proyecto; this.titulo = titulo; this.descripcion = descripcion;
        this.prioridad = prioridad; this.fechaLimite = fechaLimite; this.asignado = asignado;
    }
    public Long getId() { return id; }
    public Proyecto getProyecto() { return proyecto; }
    public String getTitulo() { return titulo; }
    public String getDescripcion() { return descripcion == null ? "" : descripcion; }
    public Prioridad getPrioridad() { return prioridad; }
    public Estado getEstado() { return estado; }
    public Usuario getAsignado() { return asignado; }
    public LocalDate getFechaLimite() { return fechaLimite; }
    public Long getVersion() { return version == null ? 0L : version; }
    public void setEstado(Estado estado) { this.estado = estado; }
    public void setAsignado(Usuario asignado) { this.asignado = asignado; }
    public void actualizar(String titulo, String descripcion, Prioridad prioridad, LocalDate fechaLimite) {
        if (titulo != null) this.titulo = titulo;
        if (descripcion != null) this.descripcion = descripcion;
        if (prioridad != null) this.prioridad = prioridad;
        this.fechaLimite = fechaLimite;
    }
}
