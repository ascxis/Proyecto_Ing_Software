package co.edu.unipamplona.taskflow;

import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.State;
import au.com.dius.pact.provider.junitsupport.loader.PactFolder;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

/** Verificación del proveedor (TaskFlowAPI) contra el contrato del consumidor (TaskFlowFrontend). */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Provider("TaskFlowAPI")
@PactFolder("src/test/resources/pacts")
class PactProveedorTest {
    @LocalServerPort int puerto;
    @Autowired ObjectMapper json;
    final HttpClient http = HttpClient.newHttpClient();

    @BeforeEach
    void destino(PactVerificationContext ctx) { ctx.setTarget(new HttpTestTarget("localhost", puerto)); }

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void verificar(PactVerificationContext ctx) { ctx.verifyInteraction(); }

    JsonNode enviar(String metodo, String ruta, String token, Object cuerpo) throws Exception {
        var b = HttpRequest.newBuilder(URI.create("http://localhost:" + puerto + ruta)).header("Content-Type", "application/json");
        if (token != null) b.header("Authorization", "Bearer " + token);
        var pub = cuerpo == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(cuerpo));
        var r = http.send(b.method(metodo, pub).build(), HttpResponse.BodyHandlers.ofString());
        if (r.statusCode() >= 300) throw new IllegalStateException(metodo + " " + ruta + " -> " + r.statusCode() + " " + r.body());
        return json.readTree(r.body());
    }

    JsonNode registrar(String nombre, String correo) throws Exception {
        return enviar("POST", "/api/auth/register", null, Map.of("nombre", nombre, "correo", correo, "clave", "secreto1"));
    }

    @State("usuario Ana registrado")
    Map<String, Object> ana() throws Exception {
        try { registrar("Ana", "ana-pact@test.co"); } catch (IllegalStateException yaExiste) { /* el estado es idempotente */ }
        return new HashMap<>();
    }

    /** Crea proyecto con Ana (propietaria) y Beto (miembro) y una tarea asignada a Beto; avanza la versión si se pide. */
    Map<String, Object> tarea(boolean consultaBeto, int avances) throws Exception {
        String s = UUID.randomUUID().toString().substring(0, 8);
        JsonNode ana = registrar("Ana", "ana-" + s + "@test.co"), beto = registrar("Beto", "beto-" + s + "@test.co");
        String tAna = ana.get("token").asText(), tBeto = beto.get("token").asText();
        String idBeto = beto.get("usuario").get("id").asText();
        String proy = enviar("POST", "/api/proyectos", tAna, Map.of("nombre", "P-" + s, "descripcion", "pact")).get("id").asText();
        enviar("POST", "/api/proyectos/" + proy + "/miembros", tAna, Map.of("usuarioId", idBeto));
        JsonNode t = enviar("POST", "/api/proyectos/" + proy + "/tareas", tAna,
                Map.of("titulo", "T", "descripcion", "d", "prioridad", "MEDIA", "asignadoId", idBeto));
        String id = t.get("id").asText();
        String[] orden = {"EN_PROCESO", "PENDIENTE"};
        long version = t.get("version").asLong();
        for (int i = 0; i < avances; i++) {
            version = enviar("PATCH", "/api/tareas/" + id + "/estado", tBeto, Map.of("estado", orden[i % 2], "version", version)).get("version").asLong();
        }
        return new HashMap<>(Map.of("tareaId", id, "token", consultaBeto ? tBeto : tAna));
    }

    @State("tarea asignada a Beto") Map<String, Object> s1() throws Exception { return tarea(true, 0); }
    @State("tarea asignada a Beto, consulta Ana") Map<String, Object> s2() throws Exception { return tarea(false, 0); }
    @State("tarea asignada a Beto con versión avanzada") Map<String, Object> s3() throws Exception { return tarea(true, 1); }
}
