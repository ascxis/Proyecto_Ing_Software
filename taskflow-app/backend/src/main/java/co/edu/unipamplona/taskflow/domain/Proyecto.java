package co.edu.unipamplona.taskflow.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "proyectos")
public class Proyecto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String nombre;
    @Column(length = 1000)
    private String descripcion;
    @Column(name = "fecha_limite")
    private LocalDate fechaLimite;
    @ManyToOne(optional = false)
    @JoinColumn(name = "creador_id")
    private Usuario creador;
    @OneToMany(mappedBy = "proyecto", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MiembroProyecto> miembros = new ArrayList<>();

    protected Proyecto() { }
    public Proyecto(String nombre, String descripcion, LocalDate fechaLimite, Usuario creador) {
        this.nombre = nombre; this.descripcion = descripcion; this.fechaLimite = fechaLimite; this.creador = creador;
    }
    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public String getDescripcion() { return descripcion == null ? "" : descripcion; }
    public LocalDate getFechaLimite() { return fechaLimite; }
    public Usuario getCreador() { return creador; }
    public List<MiembroProyecto> getMiembros() { return miembros; }

    public void agregarMiembro(Usuario u, RolProyecto rol) { miembros.add(new MiembroProyecto(this, u, rol)); }
    public boolean tieneMiembro(Long usuarioId) {
        return miembros.stream().anyMatch(m -> m.getUsuario().getId().equals(usuarioId));
    }
}
