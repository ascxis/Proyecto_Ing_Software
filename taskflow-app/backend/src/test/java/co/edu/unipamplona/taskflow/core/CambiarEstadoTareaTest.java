package co.edu.unipamplona.taskflow.core;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** Pruebas unitarias del núcleo: sin Spring, sin base de datos, con puertos falsos en memoria. */
class CambiarEstadoTareaTest {
    static class TareasMem implements TareaPuerto {
        TareaVista t = new TareaVista(1, "Diseñar login", 2L, "Ana", 1L, EstadoTarea.PENDIENTE, 0);
        int guardados = 0;
        public Optional<TareaVista> buscarVisiblePara(long id, long uid) { return (id == 1 && uid >= 1 && uid <= 2) ? Optional.of(t) : Optional.empty(); }
        public TareaVista guardarEstado(long id, EstadoTarea n) { guardados++; t = new TareaVista(1, t.titulo(), t.asignadoId(), t.asignadoNombre(), t.creadorProyectoId(), n, t.version() + 1); return t; }
    }
    static class NotifMem implements NotificadorPuerto {
        List<String> enviados = new ArrayList<>();
        public void avisar(long dest, String m) { enviados.add(dest + ":" + m); }
    }
    static ReglaNegocioException.Tipo error(Runnable r) {
        try { r.run(); } catch (ReglaNegocioException e) { return e.tipo(); }
        return null;
    }

    @Test void asignadoCambiaEstado_yAvisaAlCreador() {                                 // RN-02, RN-05
        var t = new TareasMem(); var n = new NotifMem();
        var r = new CambiarEstadoTarea(t, n).ejecutar(2, 1, "EN_PROCESO", 0L);
        assertEquals(EstadoTarea.EN_PROCESO, r.estado());
        assertEquals(List.of("1:Ana cambió \"Diseñar login\" a en proceso"), n.enviados);
    }
    @Test void noAsignado_recibeProhibido_sinGuardarNiNotificar() {                    // RN-02
        var t = new TareasMem(); var n = new NotifMem();
        assertEquals(ReglaNegocioException.Tipo.PROHIBIDO, error(() -> new CambiarEstadoTarea(t, n).ejecutar(1, 1, "COMPLETADA", null)));
        assertEquals(0, t.guardados); assertTrue(n.enviados.isEmpty());
    }
    @Test void noMiembro_veNoEncontrada() {
        assertEquals(ReglaNegocioException.Tipo.NO_ENCONTRADA, error(() -> new CambiarEstadoTarea(new TareasMem(), new NotifMem()).ejecutar(99, 1, "COMPLETADA", null)));
    }
    @Test void estadoInvalido_esEntradaInvalida() {
        assertEquals(ReglaNegocioException.Tipo.ENTRADA_INVALIDA, error(() -> new CambiarEstadoTarea(new TareasMem(), new NotifMem()).ejecutar(2, 1, "HECHA", null)));
    }
    @Test void estadoNulo_esEntradaInvalida() {
        assertEquals(ReglaNegocioException.Tipo.ENTRADA_INVALIDA, error(() -> new CambiarEstadoTarea(new TareasMem(), new NotifMem()).ejecutar(2, 1, null, null)));
    }
    @Test void versionVieja_esConflicto_sinGuardar() {
        var t = new TareasMem();
        assertEquals(ReglaNegocioException.Tipo.CONFLICTO, error(() -> new CambiarEstadoTarea(t, new NotifMem()).ejecutar(2, 1, "EN_PROCESO", 7L)));
        assertEquals(0, t.guardados);
    }
    @Test void repetirElMismoEstado_noGuardaNiNotifica() {
        var t = new TareasMem(); var n = new NotifMem();
        new CambiarEstadoTarea(t, n).ejecutar(2, 1, "PENDIENTE", 0L);
        assertEquals(0, t.guardados); assertTrue(n.enviados.isEmpty());
    }
    @Test void creadorQueCambiaElEstado_noSeAutonotifica() {
        var t = new TareasMem(); t.t = new TareaVista(1, "X", 1L, "Creador", 1L, EstadoTarea.PENDIENTE, 0);
        var n = new NotifMem(); new CambiarEstadoTarea(t, n).ejecutar(1, 1, "COMPLETADA", 0L);
        assertTrue(n.enviados.isEmpty());
    }
    @Test void transicionesLibresEntreLosTresEstados() {                                // RN-09
        var t = new TareasMem(); var c = new CambiarEstadoTarea(t, new NotifMem());
        c.ejecutar(2, 1, "COMPLETADA", 0L); c.ejecutar(2, 1, "PENDIENTE", 1L); c.ejecutar(2, 1, "EN_PROCESO", 2L);
        assertEquals(EstadoTarea.EN_PROCESO, t.t.estado()); assertEquals(3, t.guardados);
    }
    @Test void sinVersion_esEntradaInvalida_sinGuardarNiNotificar() {                    // II-03 I1: la versión es obligatoria
        var t = new TareasMem(); var n = new NotifMem();
        assertEquals(ReglaNegocioException.Tipo.ENTRADA_INVALIDA, error(() -> new CambiarEstadoTarea(t, n).ejecutar(2, 1, "EN_PROCESO", null)));
        assertEquals(0, t.guardados); assertTrue(n.enviados.isEmpty());
    }
    @Test void sinVersion_peroNoAsignado_siguiendoSiendoProhibido() {                    // no se revela nada por omitir la versión
        assertEquals(ReglaNegocioException.Tipo.PROHIBIDO, error(() -> new CambiarEstadoTarea(new TareasMem(), new NotifMem()).ejecutar(1, 1, "EN_PROCESO", null)));
    }
}
