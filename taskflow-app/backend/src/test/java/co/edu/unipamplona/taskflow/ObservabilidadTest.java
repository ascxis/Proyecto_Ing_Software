package co.edu.unipamplona.taskflow;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** Guía 13: el endpoint crítico (cambiar estado) emite métricas y /actuator/prometheus está cerrado por defecto. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ObservabilidadTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired MeterRegistry metricas;

    JsonNode post(String url, String token, Object cuerpo) throws Exception {
        var req = post(url).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cuerpo));
        if (token != null) req.header("Authorization", "Bearer " + token);
        var res = mvc.perform(req).andReturn().getResponse();
        assertTrue(res.getStatus() < 300, url + " -> " + res.getStatus());
        return json.readTree(res.getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
    }

    @Test
    void cambiarEstado_registraContadoresPorResultado_ySinDatosPersonalesEnLasEtiquetas() throws Exception {
        String s = UUID.randomUUID().toString().substring(0, 8);
        JsonNode ana = post("/api/auth/register", null, Map.of("nombre", "Ana Perez", "correo", "ana-" + s + "@test.co", "clave", "secreto1"));
        String t = ana.get("token").asText();
        JsonNode proy = post("/api/proyectos", t, Map.of("nombre", "Proyecto " + s, "descripcion", "d", "fechaLimite", "2026-12-01", "miembrosIds", java.util.List.of()));
        JsonNode tarea = post("/api/proyectos/" + proy.get("id").asText() + "/tareas", t,
                Map.of("titulo", "Tarea confidencial " + s, "descripcion", "x", "prioridad", "ALTA", "fechaLimite", "2026-11-20", "asignadoId", ana.get("usuario").get("id").asText()));
        double invalidosAntes = metricas.counter("taskflow.cambios.estado", "resultado", "entrada_invalida", "estado", "INVALIDO").count();
        double antes = metricas.counter("taskflow.cambios.estado", "resultado", "ok", "estado", "EN_PROCESO").count();
        var ok = mvc.perform(patch("/api/tareas/" + tarea.get("id").asText() + "/estado").header("Authorization", "Bearer " + t)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"EN_PROCESO\"}")).andReturn().getResponse();
        assertEquals(200, ok.getStatus());
        assertEquals(antes + 1, metricas.counter("taskflow.cambios.estado", "resultado", "ok", "estado", "EN_PROCESO").count());
        var malo = mvc.perform(patch("/api/tareas/" + tarea.get("id").asText() + "/estado").header("Authorization", "Bearer " + t)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"<script>alert(1)</script>\"}")).andReturn().getResponse();
        assertEquals(400, malo.getStatus());
        assertEquals(invalidosAntes + 1, metricas.counter("taskflow.cambios.estado", "resultado", "entrada_invalida", "estado", "INVALIDO").count(), 0.0);
        // ningún medidor lleva el correo, el nombre ni el título como etiqueta
        metricas.getMeters().forEach(m -> m.getId().getTags().forEach(tag -> {
            assertFalse(tag.getValue().contains("@test.co"), "PII en etiqueta " + tag);
            assertFalse(tag.getValue().contains("confidencial"), "título en etiqueta " + tag);
            assertFalse(tag.getValue().contains("Ana Perez"), "nombre en etiqueta " + tag);
        }));
    }

    @Test
    void prometheus_estaCerradoPorDefecto() throws Exception {
        int estado = mvc.perform(get("/actuator/prometheus")).andReturn().getResponse().getStatus();
        assertTrue(estado == 401 || estado == 403, "estado " + estado);
    }
}
