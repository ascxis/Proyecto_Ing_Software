"""Refactorización del Ejercicio 3 (Guía 1) con Inversión de Dependencias.
Núcleo (ServicioVentas) depende de dos puertos abstractos; los detalles (SQL, PayU) son adaptadores."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
import os, sqlite3

IVA = Decimal(os.environ.get("IVA", "0.19"))           # configurable, no en duro

class ErrorVenta(Exception): ...

@dataclass(frozen=True)
class Zapato: id: int; precio: Decimal; stock: int

class RepositorioVentas(ABC):                           # Puerto de salida 1
    @abstractmethod
    def buscar_zapato(self, referencia: str) -> Zapato | None: ...
    @abstractmethod
    def registrar_venta(self, cliente_nombre, cliente_cedula, zapato_id, cantidad, total) -> None: ...

class PasarelaPago(ABC):                                # Puerto de salida 2
    @abstractmethod
    def cobrar(self, total: Decimal, referencia: str) -> bool: ...

class ServicioVentas:                                   # Núcleo: sin SQL, sin claves, sin print
    def __init__(self, repo: RepositorioVentas, pasarelas: dict[str, PasarelaPago]):
        self.repo, self.pasarelas = repo, pasarelas
    def procesar(self, cliente_nombre, cliente_cedula, referencia, cantidad: int, metodo_pago: str) -> Decimal:
        if cantidad <= 0: raise ErrorVenta("cantidad inválida")
        z = self.repo.buscar_zapato(referencia)
        if z is None: raise ErrorVenta("referencia inexistente")
        if z.stock < cantidad: raise ErrorVenta("stock insuficiente")
        pasarela = self.pasarelas.get(metodo_pago)
        if pasarela is None: raise ErrorVenta("método de pago no soportado")
        total = (z.precio * cantidad * (1 + IVA)).quantize(Decimal("0.01"))
        if not pasarela.cobrar(total, referencia): raise ErrorVenta("pago rechazado")
        self.repo.registrar_venta(cliente_nombre, cliente_cedula, z.id, cantidad, total)
        return total

class RepositorioSqlite(RepositorioVentas):             # Adaptador: consultas PARAMETRIZADAS
    def __init__(self, con: sqlite3.Connection): self.con = con
    def buscar_zapato(self, referencia):
        f = self.con.execute("SELECT id, precio, stock FROM zapatos WHERE referencia = ?", (referencia,)).fetchone()
        return Zapato(f[0], Decimal(str(f[1])), f[2]) if f else None
    def registrar_venta(self, n, c, zid, cant, total):
        with self.con:   # transacción
            self.con.execute("INSERT INTO ventas (cliente_nombre, cliente_cedula, zapato_id, cantidad, total_pagado) VALUES (?,?,?,?,?)", (n, c, zid, cant, str(total)))
            self.con.execute("UPDATE zapatos SET stock = stock - ? WHERE id = ?", (cant, zid))

class PayU(PasarelaPago):                               # Adaptador: la clave viene del entorno
    def __init__(self): self.api_key = os.environ.get("PAYU_API_KEY")
    def cobrar(self, total, referencia):
        if not self.api_key: raise ErrorVenta("PAYU_API_KEY no configurada")
        return True    # aquí iría la llamada HTTPS real; nunca se imprime la clave
