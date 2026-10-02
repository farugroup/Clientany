// ============================================================
// Clientany · CRM — errores con sentido para las rutas.
// `manejar()` (auth.ts) los traduce a un código HTTP y un texto criollo.
// ============================================================

export class SinSesion extends Error {
  constructor(mensaje = "Tenés que iniciar sesión") {
    super(mensaje);
    this.name = "SinSesion";
  }
}

export class SinPermiso extends Error {
  constructor(mensaje = "Esto lo puede hacer sólo un administrador") {
    super(mensaje);
    this.name = "SinPermiso";
  }
}

export class NoEncontrado extends Error {
  constructor(mensaje = "No encontré lo que buscás") {
    super(mensaje);
    this.name = "NoEncontrado";
  }
}

export class Invalido extends Error {
  codigo: string;
  constructor(mensaje: string, codigo = "invalido") {
    super(mensaje);
    this.name = "Invalido";
    this.codigo = codigo;
  }
}

export class DemasiadasLlamadas extends Error {
  constructor(mensaje = "Demasiadas llamadas: probá en un rato") {
    super(mensaje);
    this.name = "DemasiadasLlamadas";
  }
}
