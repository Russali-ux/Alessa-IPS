export const createIPSFromControl = (row, allRows) => {
  const key = `${row.numero}-${row.denominacion}`;

  const records = allRows
    .filter(r => `${r.numero}-${r.denominacion}` === key)
    .map(r => ({
      RS: r.rs,
      denominacionIPS: r.denominacion,
      nombreProducto: r.producto,
      fechaPrimeraAutorizacion: r.fechaNacimientoLocal,
      inicioIPS: r.fechaInicioDatos,
      finIPS: r.fechaLimite,
    }));

  return {
    meta: {
      numero: row.numero,
      denominacion: row.denominacion,
      fechaInicio: row.fechaInicioDatos,
      fcd: row.fcd,
      fechaLimite: row.fechaLimite,
      aniosPeriodo: row.aniosPeriodo
    },
    records
  };
};