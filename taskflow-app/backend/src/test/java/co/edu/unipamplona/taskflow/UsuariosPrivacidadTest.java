package co.edu.unipamplona.taskflow;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** Ley 1581 de 2012: el listado de usuarios no debe exponer el correo completo de otras personas. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UsuariosPrivacidadTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    JsonNode registrar(String nombre, String correo) throws Exception {
        var res = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("nombre", nombre, "correo", correo, "clave", "secreto1")))).andReturn().getResponse();
        assertEquals(201, res.getStatus());
        return json.readTree(res.getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
    }

    @Test
    void listadoDeUsuarios_enmascaraElCorreoAjeno_yMuestraElPropio() throws Exception {
        String sufijo = UUID.randomUUID().toString().substring(0, 8);
        String correoAna = "ana-" + sufijo + "@test.co", correoBeto = "beto-" + sufijo + "@test.co";
        JsonNode ana = registrar("Ana", correoAna);
        registrar("Beto", correoBeto);
        var res = mvc.perform(get("/api/usuarios").header("Authorization", "Bearer " + ana.get("token").asText())).andReturn().getResponse();
        assertEquals(200, res.getStatus());
        String cuerpo = res.getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(cuerpo.contains(correoAna), "el titular sí ve su propio correo");
        assertFalse(cuerpo.contains(correoBeto), "el correo de otro usuario no debe viajar completo");
        assertTrue(cuerpo.contains("b***@test.co"), "el correo ajeno va enmascarado: " + cuerpo);
    }

    @Test
    void listadoDeUsuarios_sinToken_recibe401() throws Exception {
        assertEquals(401, mvc.perform(get("/api/usuarios")).andReturn().getResponse().getStatus());
    }
}
