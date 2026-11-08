package co.edu.unipamplona.taskflow.web;

import co.edu.unipamplona.taskflow.dto.Dto.*;
import co.edu.unipamplona.taskflow.service.AuthService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth = auth; }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public SesionDto registrar(@RequestBody RegistroReq r) { return auth.registrar(r); }

    @PostMapping("/auth/login")
    public SesionDto iniciar(@RequestBody LoginReq r) { return auth.iniciar(r); }

    @GetMapping("/usuarios")
    public List<UsuarioDto> usuarios(Authentication a) { return auth.listar(Actual.id(a)); }
}
