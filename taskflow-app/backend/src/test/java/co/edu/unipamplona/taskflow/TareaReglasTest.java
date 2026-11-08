package co.edu.unipamplona.taskflow;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

import co.edu.unipamplona.taskflow.repo.UsuarioRepository;
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
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Pruebas de integración de las reglas de negocio contra la API real (base H2 en memoria). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TareaReglasTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UsuarioRepository usuarios;

    record Sesion(String token, String id, String correo) { }

    Sesion ana, beto, carlos;   // ana crea el proyecto, beto es miembro, carlos no pertenece
    String proyectoId, tareaId;

    /** Ejecuta la petición una sola vez y comprueba el código HTTP. */
    JsonNode llamar(String metodo, String url, Sesion s, Object cuerpo, int esperado) throws Exception {
        MockHttpServletRequestBuilder b = request(HttpMethod.valueOf(metodo), url).contentType(MediaType.APPLICATION_JSON);
        if (s != null) b.header("Authorization", "Bearer " + s.token());
        if (cuerpo != null) b.content(json.writeValueAsString(cuerpo));
        var res = mvc.perform(b).andReturn().getResponse();
        assertEquals(esperado, res.getStatus(), metodo + " " + url + " -> " + res.getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
        String texto = res.getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        return json.readTree(texto.isEmpty() ? "{}" : texto);
    }

    Sesion registrar(String nombre) throws Exception {
        String correo = nombre.toLowerCase() + "-" + UUID.randomUUID() + "@test.co";
        JsonNode n = llamar("POST", "/api/auth/register", null, Map.of("nombre", nombre, "correo", correo, "clave", "secreto1"), 201);
        return new Sesion(n.get("token").asText(), n.get("usuario").get("id").asText(), correo);
    }

    @BeforeEach
    void escenario() throws Exception {
        ana = registrar("Ana"); beto = registrar("Beto"); carlos = registrar("Carlos");
        JsonNode p = llamar("POST", "/api/proyectos", ana,
                Map.of("nombre", "Proyecto de prueba", "descripcion", "d", "fechaLimite", "2026-12-01", "miembrosIds", List.of(beto.id())), 201);
        proyectoId = p.get("id").asText();
        JsonNode t = llamar("POST", "/api/proyectos/" + proyectoId + "/tareas", ana,
                Map.of("titulo", "Tarea de Beto", "descripcion", "x", "prioridad", "ALTA", "fechaLimite", "2026-11-20", "asignadoId", beto.id()), 201);
        tareaId = t.get("id").asText();
    }

    @Test
    void asignadoCambiaEstado_200_y_creadorRecibeNotificacion() throws Exception {
        JsonNode r = llamar("PATCH", "/api/tareas/" + tareaId + "/estado", beto, Map.of("estado", "COMPLETADA", "version", 0), 200);
        assertEquals("COMPLETADA", r.get("estado").asText());
        JsonNode notifs = llamar("GET", "/api/notificaciones", ana, null, 200);
        assertTrue(notifs.get(0).get("mensaje").asText().contains("cambió \"Tarea de Beto\" a completada"), "notificaciones de Ana: " + notifs);
        assertFalse(notifs.get(0).get("leida").asBoolean());
    }

    @Test
    void noAsignado_recibe403_y_el_estado_no_cambia() throws Exception {                 // RN-02
        llamar("PATCH", "/api/tareas/" + tareaId + "/estado", ana, Map.of("estado", "COMPLETADA", "version", 0), 403);
        JsonNode lista = llamar("GET", "/api/tareas", ana, null, 200);
        assertEquals("PENDIENTE", lista.get(0).get("estado").asText());
    }

    @Test
    void sinToken_recibe401() throws Exception {
        llamar("PATCH", "/api/tareas/" + tareaId + "/estado", null, Map.of("estado", "COMPLETADA"), 401);
    }

    @Test
    void usuarioAjenoAlProyecto_recibe404() throws Exception {
        llamar("PATCH", "/api/tareas/" + tareaId + "/estado", carlos, Map.of("estado", "COMPLETADA"), 404);
    }

    @Test
    void estadoInvalido_recibe400() throws Exception {
        llamar("PATCH", "/api/tareas/" + tareaId + "/estado", beto, Map.of("estado", "TERMINADA"), 400);
    }

    @Test
    void asignarAQuienNoEsMiembro_recibe400() throws Exception {                          // RN-01
        llamar("POST", "/api/proyectos/" + proyectoId + "/tareas", ana, Map.of("titulo", "X", "asignadoId", carlos.id()), 400);
    }

    @Test
    void versionObsoleta_recibe409() throws Exception {                                    // concurrencia
        llamar("PATCH", "/api/tareas/" + tareaId + "/estado", beto, Map.of("estado", "EN_PROCESO", "version", 0), 200);
        llamar("PATCH", "/api/tareas/" + tareaId + "/estado", beto, Map.of("estado", "COMPLETADA", "version", 0), 409);
    }

    @Test
    void repetirElMismoEstado_noNotificaDeNuevo() throws Exception {
        llamar("PATCH", "/api/tareas/" + tareaId + "/estado", beto, Map.of("estado", "EN_PROCESO", "version", 0), 200);
        int antes = llamar("GET", "/api/notificaciones", ana, null, 200).size();
        llamar("PATCH", "/api/tareas/" + tareaId + "/estado", beto, Map.of("estado", "EN_PROCESO", "version", 1), 200);
        assertEquals(antes, llamar("GET", "/api/notificaciones", ana, null, 200).size());
    }

    @Test
    void proyectoConTareasPendientes_noSeElimina_409() throws Exception {                 // RN-04
        llamar("DELETE", "/api/proyectos/" + proyectoId, ana, null, 409);
        llamar("PATCH", "/api/tareas/" + tareaId + "/estado", beto, Map.of("estado", "COMPLETADA", "version", 0), 200);
        llamar("DELETE", "/api/proyectos/" + proyectoId, ana, null, 204);
    }

    @Test
    void soloElCreadorElimina_403() throws Exception {
        llamar("DELETE", "/api/proyectos/" + proyectoId, beto, null, 403);
    }

    @Test
    void avanceDelProyecto_secalculaConLasTareasCompletadas() throws Exception {          // RN-10
        assertEquals(0, llamar("GET", "/api/proyectos/" + proyectoId, ana, null, 200).get("avance").asInt());
        llamar("PATCH", "/api/tareas/" + tareaId + "/estado", beto, Map.of("estado", "COMPLETADA", "version", 0), 200);
        assertEquals(100, llamar("GET", "/api/proyectos/" + proyectoId, ana, null, 200).get("avance").asInt());
    }

    @Test
    void registro_validaClaveCorta_correoRepetido_y_guardaHash() throws Exception {      // RN-08
        llamar("POST", "/api/auth/register", null, Map.of("nombre", "Z", "correo", "z@test.co", "clave", "12345"), 400);
        llamar("POST", "/api/auth/register", null, Map.of("nombre", "Ana2", "correo", ana.correo().toUpperCase(), "clave", "secreto1"), 409);
        String hash = usuarios.findByCorreoIgnoreCase(ana.correo()).orElseThrow().getClaveHash();
        assertTrue(hash.startsWith("$2"), "la contraseña debe guardarse con BCrypt");
        assertNotEquals("secreto1", hash);
    }

    @Test
    void login_conClaveIncorrecta_recibe401_y_con_la_correcta_200() throws Exception {
        llamar("POST", "/api/auth/login", null, Map.of("correo", ana.correo(), "clave", "mala"), 401);
        llamar("POST", "/api/auth/login", null, Map.of("correo", ana.correo(), "clave", "secreto1"), 200);
    }
}
