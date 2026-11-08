import sqlite3, os, unittest
from decimal import Decimal
from venta_refactor import *
class Falsa(PasarelaPago):
    def __init__(s, ok=True): s.ok, s.llamadas = ok, 0
    def cobrar(s, t, r): s.llamadas += 1; return s.ok
def bd():
    c = sqlite3.connect(":memory:")
    c.executescript("CREATE TABLE zapatos(id INTEGER PRIMARY KEY, referencia TEXT, precio REAL, stock INT);"
        "CREATE TABLE ventas(id INTEGER PRIMARY KEY, cliente_nombre TEXT, cliente_cedula TEXT, zapato_id INT, cantidad INT, total_pagado TEXT);"
        "INSERT INTO zapatos VALUES (1,'REF-1',100000,5);")
    return c
class T(unittest.TestCase):
    def test_total_con_iva(self):
        c = bd(); s = ServicioVentas(RepositorioSqlite(c), {"PAYU": Falsa()})
        self.assertEqual(s.procesar("Ana", "0000", "REF-1", 2, "PAYU"), Decimal("238000.00"))
        self.assertEqual(c.execute("SELECT stock FROM zapatos").fetchone()[0], 3)
    def test_inyeccion_no_funciona(self):
        c = bd(); s = ServicioVentas(RepositorioSqlite(c), {"PAYU": Falsa()})
        with self.assertRaises(ErrorVenta): s.procesar("x", "0", "' OR '1'='1", 1, "PAYU")
        with self.assertRaises(ErrorVenta): s.procesar("x'); DROP TABLE ventas;--", "0", "REF-1", 99, "PAYU")  # stock insuficiente, tabla intacta
        self.assertEqual(c.execute("SELECT count(*) FROM ventas").fetchone()[0], 0)
    def test_pago_rechazado_no_registra(self):
        c = bd(); s = ServicioVentas(RepositorioSqlite(c), {"PAYU": Falsa(False)})
        with self.assertRaises(ErrorVenta): s.procesar("Ana", "0", "REF-1", 1, "PAYU")
        self.assertEqual(c.execute("SELECT count(*) FROM ventas").fetchone()[0], 0)
    def test_metodo_no_soportado_y_sin_clave(self):
        c = bd()
        with self.assertRaises(ErrorVenta): ServicioVentas(RepositorioSqlite(c), {}).procesar("A", "0", "REF-1", 1, "BITCOIN")
        os.environ.pop("PAYU_API_KEY", None)
        with self.assertRaises(ErrorVenta): ServicioVentas(RepositorioSqlite(c), {"PAYU": PayU()}).procesar("A", "0", "REF-1", 1, "PAYU")
    def test_nucleo_sin_infraestructura(self):
        import inspect, venta_refactor as m
        src = inspect.getsource(m.ServicioVentas)
        for prohibido in ("sqlite3", "execute", "print(", "api_key", "SELECT"): self.assertNotIn(prohibido, src)
unittest.main(verbosity=2)
