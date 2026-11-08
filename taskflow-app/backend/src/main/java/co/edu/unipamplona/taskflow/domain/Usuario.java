package co.edu.unipamplona.taskflow.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "usuarios")
public class Usuario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String nombre;
    @Column(nullable = false, unique = true)
    private String correo;
    /** Hash BCrypt; nunca se guarda la contraseña en texto plano. */
    @Column(name = "clave_hash", nullable = false)
    private String claveHash;
    private String cargo;

    protected Usuario() { }
    public Usuario(String nombre, String correo, String claveHash, String cargo) {
        this.nombre = nombre; this.correo = correo; this.claveHash = claveHash; this.cargo = cargo;
    }
    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public String getCorreo() { return correo; }
    public String getClaveHash() { return claveHash; }
    public String getCargo() { return cargo == null ? "" : cargo; }
}
