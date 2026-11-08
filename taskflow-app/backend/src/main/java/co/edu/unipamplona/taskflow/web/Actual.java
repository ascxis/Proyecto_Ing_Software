package co.edu.unipamplona.taskflow.web;

import org.springframework.security.core.Authentication;

/** Id del usuario autenticado, tomado del token validado por el filtro. */
final class Actual {
    private Actual() { }
    static Long id(Authentication a) { return (Long) a.getPrincipal(); }
}
