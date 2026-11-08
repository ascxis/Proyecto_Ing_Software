package co.edu.unipamplona.taskflow.web;

import co.edu.unipamplona.taskflow.dto.Dto.*;
import co.edu.unipamplona.taskflow.service.TareaService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tareas")
public class TareaController {
    private final TareaService tareas;
    public TareaController(TareaService tareas) { this.tareas = tareas; }

    private static Long num(String s) {
        try { return Long.valueOf(s); } catch (NumberFormatException e) { throw new ApiException(HttpStatus.NOT_FOUND, "No encontrado"); }
    }

    @GetMapping
    public List<TareaDto> listar(Authentication a) { return tareas.deUsuario(Actual.id(a)); }

    /** 200 cambio aplicado · 400 estado inválido · 403 no es el asignado · 404 no existe · 409 versión obsoleta. */
    @PatchMapping("/{id}/estado")
    public TareaDto cambiarEstado(Authentication a, @PathVariable String id, @RequestBody EstadoReq r) {
        return tareas.cambiarEstado(Actual.id(a), num(id), r);
    }

    @PutMapping("/{id}")
    public TareaDto editar(Authentication a, @PathVariable String id, @RequestBody TareaReq r) { return tareas.editar(Actual.id(a), num(id), r); }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(Authentication a, @PathVariable String id) { tareas.eliminar(Actual.id(a), num(id)); }
}
