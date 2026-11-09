package co.edu.unipamplona.taskflow;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Pruebas de integración de proyectos, miembros, edición/eliminación de tareas y notificaciones (H2 en memoria). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProyectosYTareasTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    record Sesion(String token, String id) { }

    Sesion ana, beto, carlos;   // ana crea el proyecto, beto es miembro, carlos no pertenece
    String proyectoId, tareaId;

    JsonNode llamar(String metodo, String url, Sesion s, Object cuerpo, int esperado) throws Exception {
        MockHttpServletRequestBuilder b = request(HttpMethod.valueOf(metodo), url).contentType(MediaType.APPLICATION_JSON);
        if (s != null) b.header("Authorization", "Bearer " + s.token());
        if (cuerpo != null) b.content(json.writeValueAsString(cuerpo));
        var res = mvc.perform(b).andReturn().getResponse();
        String texto = res.getContentAsString(StandardCharsets.UTF_8);
        assertEquals(esperado, res.getStatus(), metodo + " " + url + " -> " + texto);
        return json.readTree(texto.isEmpty() ? "{}" : texto);
    }

    Sesion registrar(String nombre) throws Exception {
        String correo = nombre.toLowerCase() + "-" + UUID.randomUUID() + "@test.co";
        JsonNode n = llamar("POST", "/api/auth/register", null, Map.of("nombre", nombre, "correo", correo, "clave", "secreto1"), 201);
        return new Sesion(n.get("token").asText(), n.get("usuario").get("id").asText());
    }

    @BeforeEach
    void escenario() throws Exception {
        ana = registrar("Ana"); beto = registrar("Beto"); carlos = registrar("Carlos");
        JsonNode p = llamar("POST", "/api/proyectos", ana,
                Map.of("nombre", "Proyecto B", "descripcion", "d", "fechaLimite", "2026-12-01", "miembrosIds", List.of(beto.id())), 201);
        proyectoId = p.get("id").asText();
        tareaId = llamar("POST", "/api/proyectos/" + proyectoId + "/tareas", ana,
                Map.of("titulo", "Tarea B", "descripcion", "x", "prioridad", "ALTA", "fechaLimite", "2026-11-20", "asignadoId", beto.id()), 201).get("id").asText();
    }

    @Test
    void listarYObtenerProyecto() throws Exception {
        assertTrue(llamar("GET", "/api/proyectos", ana, null, 200).size() >= 1);
        JsonNode p = llamar("GET", "/api/proyectos/" + proyectoId, ana, null, 200);
        assertEquals("Proyecto B", p.get("nombre").asText());
        assertEquals(1, p.get("totalTareas").asInt());
        llamar("GET", "/api/proyectos/" + proyectoId, carlos, null, 403);      // no pertenece
        llamar("GET", "/api/proyectos/999999", ana, null, 404);
        llamar("GET", "/api/proyectos/abc", ana, null, 404);
        assertTrue(llamar("GET", "/api/tareas", ana, null, 200).size() >= 1);
    }

    @Test
    void crearProyectoSinNombre_400_y_cuerpoInvalido_400() throws Exception {
        llamar("POST", "/api/proyectos", ana, Map.of("nombre", " ", "descripcion", "d", "fechaLimite", "2026-12-01"), 400);
        llamar("POST", "/api/proyectos", ana, "esto no es un objeto", 400);
    }

    @Test
    void agregarMiembro_notifica_y_solo_el_creador_gestiona() throws Exception {
        JsonNode p = llamar("POST", "/api/proyectos/" + proyectoId + "/miembros", ana, Map.of("usuarioId", carlos.id()), 200);
        assertEquals(3, p.get("miembros").size());
        JsonNode notifs = llamar("GET", "/api/notificaciones", carlos, null, 200);
        assertTrue(notifs.get(0).get("mensaje").asText().contains("añadido al proyecto Proyecto B"));
        llamar("POST", "/api/proyectos/" + proyectoId + "/miembros", ana, Map.of("usuarioId", carlos.id()), 200);   // repetir no duplica
        llamar("POST", "/api/proyectos/" + proyectoId + "/miembros", beto, Map.of("usuarioId", carlos.id()), 403);
        llamar("POST", "/api/proyectos/" + proyectoId + "/miembros", ana, Map.of("usuarioId", "999999"), 404);
    }

    @Test
    void quitarMiembro_RN06_y_permisos() throws Exception {
        llamar("DELETE", "/api/proyectos/" + proyectoId + "/miembros/" + ana.id(), ana, null, 400);   // no se quita al creador
        llamar("DELETE", "/api/proyectos/" + proyectoId + "/miembros/" + beto.id(), beto, null, 403);
        JsonNode p = llamar("DELETE", "/api/proyectos/" + proyectoId + "/miembros/" + beto.id(), ana, null, 200);
        assertEquals(1, p.get("miembros").size());
    }

    @Test
    void notificaciones_marcarComoLeida() throws Exception {
        JsonNode lista = llamar("GET", "/api/notificaciones", beto, null, 200);       // beto recibió la asignación
        String id = lista.get(0).get("id").asText();
        assertFalse(lista.get(0).get("leida").asBoolean());
        assertTrue(llamar("POST", "/api/notificaciones/" + id + "/leer", beto, null, 200).get("leida").asBoolean());
        llamar("POST", "/api/notificaciones/" + id + "/leer", carlos, null, 404);      // no es suya
        llamar("POST", "/api/notificaciones/abc/leer", beto, null, 404);
    }

    @Test
    void editarSinFechaLimite_conservaLaFecha_N7() throws Exception {                 // II-03 I2: N7 confirmado y corregido
        JsonNode antes = llamar("GET", "/api/tareas", ana, null, 200);
        String fecha = antes.get(0).get("fechaLimite").asText();
        assertFalse(fecha.isEmpty());
        llamar("PUT", "/api/tareas/" + tareaId, ana, Map.of("titulo", "Solo cambio el título"), 200);
        assertEquals(fecha, llamar("GET", "/api/tareas", ana, null, 200).get(0).get("fechaLimite").asText());
        llamar("PUT", "/api/tareas/" + tareaId, ana, Map.of("titulo", "Quito la fecha", "fechaLimite", ""), 200);   // "" la quita a propósito
        assertEquals("", llamar("GET", "/api/tareas", ana, null, 200).get(0).get("fechaLimite").asText());
    }

    @Test
    void editarTarea_soloElCreador() throws Exception {
        JsonNode t = llamar("PUT", "/api/tareas/" + tareaId, ana,
                Map.of("titulo", "Nuevo título", "descripcion", "y", "prioridad", "BAJA", "fechaLimite", "2026-11-25"), 200);
        assertEquals("Nuevo título", t.get("titulo").asText());
        assertEquals("BAJA", t.get("prioridad").asText());
        llamar("PUT", "/api/tareas/" + tareaId, ana, Map.of("titulo", "Sin asignado", "asignadoId", ""), 200);   // "" quita la asignación
        llamar("PUT", "/api/tareas/" + tareaId, ana, Map.of("titulo", "Reasignada", "asignadoId", beto.id()), 200);
        llamar("PUT", "/api/tareas/" + tareaId, beto, Map.of("titulo", "No puedo"), 403);
        llamar("PUT", "/api/tareas/" + tareaId, carlos, Map.of("titulo", "Ajeno"), 404);
        llamar("PUT", "/api/tareas/" + tareaId, ana, Map.of("titulo", "A un no miembro", "asignadoId", carlos.id()), 400);
    }

    @Test
    void crearTareaSinTitulo_400() throws Exception {
        llamar("POST", "/api/proyectos/" + proyectoId + "/tareas", ana, Map.of("titulo", "", "descripcion", "x", "prioridad", "ALTA"), 400);
    }

    @Test
    void eliminarTarea_y_luegoProyecto() throws Exception {
        llamar("DELETE", "/api/tareas/" + tareaId, beto, null, 403);                    // solo el creador
        llamar("DELETE", "/api/proyectos/" + proyectoId, beto, null, 403);
        llamar("DELETE", "/api/tareas/" + tareaId, ana, null, 204);
        llamar("DELETE", "/api/proyectos/" + proyectoId, ana, null, 204);              // ya sin tareas pendientes (RN-04)
        llamar("GET", "/api/proyectos/" + proyectoId, ana, null, 404);
    }
}
