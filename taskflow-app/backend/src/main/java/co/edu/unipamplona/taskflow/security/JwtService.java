package co.edu.unipamplona.taskflow.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final SecretKey key;
    private final long ttlMs;

    public JwtService(@Value("${taskflow.jwt.secret}") String secreto, @Value("${taskflow.jwt.ttl-hours:24}") long horas) {
        this.key = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        this.ttlMs = horas * 3_600_000L;
    }

    public String generar(Long usuarioId) {
        Date ahora = new Date();
        return Jwts.builder().subject(String.valueOf(usuarioId)).issuedAt(ahora)
                .expiration(new Date(ahora.getTime() + ttlMs)).signWith(key).compact();
    }

    /** Devuelve el id del usuario si el token es válido y no ha expirado. */
    public Optional<Long> validar(String token) {
        try {
            Claims c = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return Optional.of(Long.valueOf(c.getSubject()));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
