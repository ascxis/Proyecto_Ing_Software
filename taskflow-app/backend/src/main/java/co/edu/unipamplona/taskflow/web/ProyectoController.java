package co.edu.unipamplona.taskflow.web;

import co.edu.unipamplona.taskflow.dto.Dto.*;
import co.edu.unipamplona.taskflow.service.ProyectoService;
import co.edu.unipamplona.taskflow.service.TareaService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/proyectos")
public class ProyectoController {
    private final ProyectoService proyectos;
    private final TareaService tareas;
    public ProyectoController(ProyectoService proyectos, TareaService tareas) { this.proyectos = proyectos; this.tareas = tareas; }

    private static Long num(String s) {
        try { return Long.valueOf(s); } catch (NumberFormatException e) { throw new ApiException(HttpStatus.NOT_FOUND, "No encontrado"); }
    }

    @GetMapping
    public List<ProyectoDto> listar(Authentication a) { return proyectos.deUsuario(Actual.id(a)); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProyectoDto crear(Authentication a, @RequestBody ProyectoReq r) { return proyectos.crear(Actual.id(a), r); }

    @GetMapping("/{id}")
    public ProyectoDto obtener(Authentication a, @PathVariable String id) { return proyectos.obtener(Actual.id(a), num(id)); }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(Authentication a, @PathVariable String id) { proyectos.eliminar(Actual.id(a), num(id)); }

    @PostMapping("/{id}/tareas")
    @ResponseStatus(HttpStatus.CREATED)
    public TareaDto crearTarea(Authentication a, @PathVariable String id, @RequestBody TareaReq r) { return tareas.crear(Actual.id(a), num(id), r); }

    @PostMapping("/{id}/miembros")
    public ProyectoDto agregarMiembro(Authentication a, @PathVariable String id, @RequestBody MiembroReq r) {
        return proyectos.agregarMiembro(Actual.id(a), num(id), num(r.usuarioId()));
    }

    @DeleteMapping("/{id}/miembros/{usuarioId}")
    public ProyectoDto quitarMiembro(Authentication a, @PathVariable String id, @PathVariable String usuarioId) {
        return proyectos.quitarMiembro(Actual.id(a), num(id), num(usuarioId));
    }
}
