package co.edu.unipamplona.taskflow;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * Pruebas de caracterización (guía 15): fijan el comportamiento de TareaService.crear/editar/eliminar ANTES de
 * refactorizarlo (extraer la regla «solo el creador» y el aviso de asignación) y deben seguir en verde después.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TareaServiceCaracterizacionTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    record Sesion(String token, String id) { }
    Sesion ana, beto;
    String proyectoId, tareaId;

    JsonNode llamar(String metodo, String url, Sesion s, Object cuerpo, int esperado) throws Exception {
        MockHttpServletRequestBuilder b = request(org.springframework.http.HttpMethod.valueOf(metodo), url).contentType(MediaType.APPLICATION_JSON);
        if (s != null) b.header("Authorization", "Bearer " + s.token());
        if (cuerpo != null) b.content(json.writeValueAsString(cuerpo));
        var res = mvc.perform(b).andReturn().getResponse();
        String texto = res.getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        assertEquals(esperado, res.getStatus(), metodo + " " + url + " -> " + texto);
        return json.readTree(texto.isEmpty() ? "{}" : texto);
    }

    Sesion registrar(String nombre) throws Exception {
        JsonNode n = llamar("POST", "/api/auth/register", null,
                Map.of("nombre", nombre, "correo", nombre.toLowerCase() + "-" + UUID.randomUUID() + "@test.co", "clave", "secreto1"), 201);
        return new Sesion(n.get("token").asText(), n.get("usuario").get("id").asText());
    }

    @BeforeEach
    void escenario() throws Exception {
        ana = registrar("Ana"); beto = registrar("Beto");
        proyectoId = llamar("POST", "/api/proyectos", ana,
                Map.of("nombre", "P", "descripcion", "d", "fechaLimite", "2026-12-01", "miembrosIds", List.of(beto.id())), 201).get("id").asText();
        tareaId = llamar("POST", "/api/proyectos/" + proyectoId + "/tareas", ana,
                Map.of("titulo", "Tarea X", "descripcion", "x", "prioridad", "ALTA", "fechaLimite", "2026-11-20", "asignadoId", beto.id()), 201).get("id").asText();
    }

    long avisosDeAsignacion(Sesion s) throws Exception {
        JsonNode l = llamar("GET", "/api/notificaciones", s, null, 200);
        long n = 0; for (JsonNode x : l) if (x.get("mensaje").asText().startsWith("Se te asignó la tarea")) n++;
        return n;
    }

    @Test
    void editarYEliminar_porNoCreador_403_conMensajeExacto() throws Exception {
        assertEquals("Solo el creador del proyecto puede editar tareas",
                llamar("PUT", "/api/tareas/" + tareaId, beto, Map.of("titulo", "No puedo"), 403).get("error").asText());
        assertEquals("Solo el creador del proyecto puede eliminar tareas",
                llamar("DELETE", "/api/tareas/" + tareaId, beto, null, 403).get("error").asText());
    }

    @Test
    void crearConTituloVacio_400_conMensajeExacto() throws Exception {
        assertEquals("El título es obligatorio", llamar("POST", "/api/proyectos/" + proyectoId + "/tareas", ana,
                Map.of("titulo", " ", "descripcion", "x", "prioridad", "ALTA"), 400).get("error").asText());
    }

    @Test
    void aviso_soloCuandoCambiaElResponsable() throws Exception {
        assertEquals(1, avisosDeAsignacion(beto), "la creación avisó una vez");
        llamar("PUT", "/api/tareas/" + tareaId, ana, Map.of("titulo", "Mismo responsable", "asignadoId", beto.id()), 200);
        assertEquals(1, avisosDeAsignacion(beto), "reasignar a la misma persona no avisa de nuevo");
        llamar("PUT", "/api/tareas/" + tareaId, ana, Map.of("titulo", "Sin responsable", "asignadoId", ""), 200);
        assertEquals(1, avisosDeAsignacion(beto), "quitar la asignación no avisa");
        llamar("PUT", "/api/tareas/" + tareaId, ana, Map.of("titulo", "Otra vez a Beto", "asignadoId", beto.id()), 200);
        assertEquals(2, avisosDeAsignacion(beto), "asignar de nuevo sí avisa");
    }

    @Test
    void eliminar_porElCreador_204_yLaTareaDesaparece() throws Exception {
        llamar("DELETE", "/api/tareas/" + tareaId, ana, null, 204);
        llamar("PUT", "/api/tareas/" + tareaId, ana, Map.of("titulo", "ya no existe"), 404);
    }
}
