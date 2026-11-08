package co.edu.unipamplona.taskflow.service;

import co.edu.unipamplona.taskflow.domain.Usuario;
import co.edu.unipamplona.taskflow.dto.Dto.*;
import co.edu.unipamplona.taskflow.repo.UsuarioRepository;
import co.edu.unipamplona.taskflow.security.JwtService;
import co.edu.unipamplona.taskflow.web.ApiException;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private static final Pattern CORREO = Pattern.compile("^\\S+@\\S+\\.\\S+$");
    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder encoder, JwtService jwt) {
        this.usuarios = usuarios; this.encoder = encoder; this.jwt = jwt;
    }

    /** RN-08: correo único y contraseña de al menos 6 caracteres; se guarda solo el hash. */
    public SesionDto registrar(RegistroReq r) {
        if (r.correo() == null || !CORREO.matcher(r.correo()).matches()) throw new ApiException(HttpStatus.BAD_REQUEST, "Correo inválido");
        if (r.clave() == null || r.clave().length() < 6) throw new ApiException(HttpStatus.BAD_REQUEST, "La contraseña debe tener al menos 6 caracteres");
        if (usuarios.existsByCorreoIgnoreCase(r.correo())) throw new ApiException(HttpStatus.CONFLICT, "El correo ya está registrado");
        String nombre = (r.nombre() == null || r.nombre().isBlank()) ? r.correo().substring(0, r.correo().indexOf('@')) : r.nombre();
        Usuario u = usuarios.save(new Usuario(nombre, r.correo(), encoder.encode(r.clave()), "Miembro"));
        return new SesionDto(jwt.generar(u.getId()), Mapeo.usuario(u));
    }

    public SesionDto iniciar(LoginReq r) {
        Usuario u = usuarios.findByCorreoIgnoreCase(r.correo() == null ? "" : r.correo())
                .filter(x -> r.clave() != null && encoder.matches(r.clave(), x.getClaveHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos"));
        return new SesionDto(jwt.generar(u.getId()), Mapeo.usuario(u));
    }

    /** Ley 1581: el correo completo solo se entrega a su titular; de los demás usuarios se devuelve enmascarado (a***@dominio). */
    public List<UsuarioDto> listar(Long solicitanteId) {
        return usuarios.findAll().stream().map(u -> u.getId().equals(solicitanteId)
                ? Mapeo.usuario(u)
                : new UsuarioDto(String.valueOf(u.getId()), u.getNombre(), enmascarar(u.getCorreo()), u.getCargo())).toList();
    }

    static String enmascarar(String correo) {
        if (correo == null) return null;
        int at = correo.indexOf('@');
        return at <= 0 ? "***" : correo.charAt(0) + "***" + correo.substring(at);
    }
}
