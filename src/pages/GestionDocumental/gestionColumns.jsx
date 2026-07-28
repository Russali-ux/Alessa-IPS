export const gestionColumns = [
  {
    label: "N°",
    key: "numero_ips",
    sortable: true,
  },
  {
    label: "Denominación IPS",
    key: "denominacion",
    sortable: true,
  },
  {
    label: "IPS Number",
    key: "codigo_ips",
    sortable: true,
  },
  {
    label: "Inicio Periodo",
    key: "period_start",
    sortable: true,
    render: (value) => {
      if (!value) return "-";
      return new Date(value).toLocaleDateString();
    }
  },
  {
    label: "Fin Periodo",
    key: "period_end",
    sortable: true,
    render: (value) => {
      if (!value) return "-";
      return new Date(value).toLocaleDateString();
    }
  },
  {
    label: "Fecha Límite",
    key: "submission_deadline",
    sortable: true,
    render: (value) => {
      if (!value) return "-";
      return new Date(value).toLocaleDateString();
    }
  },
  {
    label: "Estado",
    key: "version_status",
    sortable: true,
    render: (value) => {
      let colorClass = "bg-gray-100 text-gray-700";
      if (value === "Borrador") colorClass = "bg-blue-100 text-blue-700";
      if (value === "En revisión") colorClass = "bg-yellow-100 text-yellow-700";
      if (value === "Aprobado") colorClass = "bg-green-100 text-green-700";
      if (value === "Sometido") colorClass = "bg-purple-100 text-purple-700";
      
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
          {value || "No iniciado"}
        </span>
      );
    }
  },
  {
    label: "Creado",
    key: "created_at",
    sortable: true,
    render: (value) => {
      if (!value) return "-";
      return new Date(value).toLocaleDateString();
    }
  }
];
