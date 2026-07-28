const formatDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const ipsColumns = [

  {
    key: "numero",
    label: "N°",
    filterable: false,
    width: "50px",
  },

  {
    key: "rs",
    label: "R.S.",
    width: "120px",
  },

  {
    key: "denominacion",
    label: "IPS Denominación",
    width: "150px",
  },

  {
    key: "producto",
    label: "Nombre Producto",
    width: "150px",
  },

  {
    key: "fabricante",
    label: "Fabricante",
    width: "150px",
  },

  {
    key: "edadProducto",
    label: "Edad (Producto)",
    width: "150px",
  },

  {
    key: "fechaNacimientoLocal",
    label: "F. Nac Local",
    width: "150px",
    render: (val) => formatDate(val),
  },

  {
    key: "fechaInicioDatos",
    label: "F. Inicio datos",
    width: "150px",
    render: (val) => formatDate(val),
  },

  {
    key: "fcd",
    label: "F. Corte Datos (FCD)",
    width: "150px",
    render: (val) => formatDate(val),
  },

  {
    key: "fechaLimite",
    label: "F. Límite Autoridad",
    width: "150px",
    render: (val) => formatDate(val),
  },

  {
    key: "estado",
    label: "Estado Actual",
    width: "150px",
  },

  {
    key: "aniosPeriodo",
    label: "Años (periodo)",
    width: "100px",
  },

  {
    key: "comentarios",
    label: "Comentarios",
  },

  {
    key: "ipsBasal",
    label: "IPS BASAL",
    width: "100px",
  },

  {
    key: "asignado",
    label: "Asignado",
    width: "100px",
  },

  {
    key: "mes",
    label: "MES",
    width: "100px",
  },

  {
    key: "fechaEntrega",
    label: "F. entrega",
    width: "150px",
    render: (val) => formatDate(val),
  },

];