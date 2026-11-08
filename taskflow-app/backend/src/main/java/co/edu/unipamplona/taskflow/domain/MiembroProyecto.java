package co.edu.unipamplona.taskflow.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "miembros_proyecto", uniqueConstraints = @UniqueConstraint(columnNames = {"proyecto_id", "usuario_id"}))
public class MiembroProyecto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false)
    @JoinColumn(name = "proyecto_id")
    private Proyecto proyecto;
    @ManyToOne(optional = false)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RolProyecto rol;

    protected MiembroProyecto() { }
    public MiembroProyecto(Proyecto proyecto, Usuario usuario, RolProyecto rol) {
        this.proyecto = proyecto; this.usuario = usuario; this.rol = rol;
    }
    public Long getId() { return id; }
    public Proyecto getProyecto() { return proyecto; }
    public Usuario getUsuario() { return usuario; }
    public RolProyecto getRol() { return rol; }
}
