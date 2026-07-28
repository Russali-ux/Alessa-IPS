/**
 * ips_paragraph_rules.js
 * ---------------------------------------------------------------------------
 * Reglas de redacción para los párrafos dinámicos del catálogo ips_catalog.json
 * (sección "paragraphs"). Cada función recibe el objeto "data" con los campos
 * indicados en "inputs" del catálogo y retorna el texto plano final que debe
 * insertarse en el Word, en reemplazo del "placeholder" correspondiente.
 *
 * Convención general:
 *  - Las funciones NUNCA devuelven null/undefined: si falta un dato obligatorio
 *    deben lanzar un Error explícito (fail-fast), para que la plataforma no
 *    genere un IPS con huecos silenciosos.
 *  - Las funciones SÍ pueden devolver una redacción alternativa cuando la
 *    ausencia de dato es un caso de negocio válido (ej. "no se han registrado
 *    unidades comercializadas"), no un error de captura.
 *  - El formato de fecha esperado de entrada es "dd-mmm-yyyy" en español
 *    abreviado (ej. "12-Mar-2025"), tal como lo captura el formulario.
 * ---------------------------------------------------------------------------
 */

// =============================================================================
// Helpers compartidos
// =============================================================================

/**
 * Convierte fecha "dd-mmm-yyyy" a "dd/mm/yyyy" (formato usado SOLO en
 * Tabla 1 y en el Anexo de Estatus Regulatorio).
 */
const MES_A_NUM = {
  ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06",
  jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12",
};
function toSlashDate(ddMmmYyyy) {
  const [dd, mmm, yyyy] = ddMmmYyyy.split("-");
  const mm = MES_A_NUM[mmm.toLowerCase()];
  if (!mm) throw new Error(`Mes no reconocido en fecha: "${ddMmmYyyy}"`);
  return `${dd}/${mm}/${yyyy}`;
}

/** Junta una lista de strings con coma, sin "y" antes del último elemento
 *  (patrón observado en el documento real: "..., para X corresponde al ...,
 *  para Y corresponde al ..."). */
function joinNoAnd(parts) {
  return parts.join(", ");
}

// =============================================================================
// 1. local_birth_date
//    Placeholder(s): [parrafo_intro], [nacimiento_local]
//    Fórmula observada:
//      "en Perú para {Producto} {Concentración} {FormaFarmacéutica}
//       corresponde al {fecha}" repetido por cada presentación, unido por coma.
//
//    Nota de calidad de dato: el documento de ejemplo (IPS_PAZOPANIB_01) escribe
//    "Tableta Recubierta" en unas ocurrencias y "Tableta recubierta" en otras
//    (inconsistencia de tipeo manual, no una regla de negocio). Esta función
//    usa siempre tal cual el valor de pharma_form capturado en el formulario,
//    para que el documento generado sea consistente en todas sus apariciones.
// =============================================================================
function local_birth_date(data) {
  const { presentations, product_name } = data;

  if (!Array.isArray(presentations) || presentations.length === 0) {
    throw new Error("local_birth_date: se requiere al menos 1 presentación con fecha de autorización local.");
  }

  const frases = presentations.map((p) => {
    if (!p.local_auth_date) {
      throw new Error(`local_birth_date: falta local_auth_date para la presentación "${p.presentation_name}".`);
    }
    // Primera presentación lleva el prefijo "en Perú", las siguientes solo "para..."
    return `${p.presentation_name} ${p.pharma_form} corresponde al ${p.local_auth_date}`;
  });

  // Se arma como: "en Perú para {Producto} 200mg Tableta Recubierta corresponde
  // al 12-Mar-2025, para Pazopanib 400mg Tableta Recubierta corresponde al 18-Mar-2025"
  const primera = `en Perú para ${product_name} ${frases[0]}`;
  const resto = frases.slice(1).map((f) => `para ${product_name} ${f}`);

  return joinNoAnd([primera, ...resto]);
}

// =============================================================================
// 2. ips_ordinal
//    Placeholder: [nmVersion]
//    Convierte un entero (numIPS) a ordinal textual + número entre paréntesis
//    con símbolo de grado, ej. 1 -> "primer (1°)"
// =============================================================================
const ORDINALES_ES = [
  null, "primer", "segundo", "tercer", "cuarto", "quinto",
  "sexto", "séptimo", "octavo", "noveno", "décimo",
];
function ips_ordinal(data) {
  const n = Number(data.ips_revision_number);

  if (!Number.isInteger(n) || n < 1) {
    throw new Error("ips_ordinal: ips_revision_number debe ser un entero >= 1.");
  }

  const texto = ORDINALES_ES[n] || `${n}°`; // fallback genérico más allá de "décimo"
  return `${texto} (${n}°)`;
}

// =============================================================================
// 3. indications_list
//    Placeholder: [pfIndic1]
//    1 indicación  -> se inserta tal cual.
//    2+ indicaciones -> "i) A; ii) B; iii) C" (romanos minúscula + paréntesis,
//    separados por punto y coma, SIN punto final).
// =============================================================================
const ROMANOS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
function indications_list(data) {
  const { indications } = data;

  if (!Array.isArray(indications) || indications.length === 0) {
    throw new Error("indications_list: se requiere al menos 1 indicación aprobada.");
  }

  if (indications.length === 1) {
    return indications[0];
  }

  if (indications.length > ROMANOS.length) {
    throw new Error(`indications_list: máximo ${ROMANOS.length} indicaciones soportadas por el catálogo de romanos.`);
  }

  return indications
    .map((ind, i) => `${ROMANOS[i]}) ${ind}`)
    .join("; ");
}

// =============================================================================
// 4. indications_with_dose
//    Placeholder: [pfIndic2]
//    Igual que indications_list, pero agrega la cláusula de dosis/vía/alimentos.
// =============================================================================
function indications_with_dose(data) {
  const {
    indications,
    recommended_dose,
    dose_unit,
    administration_route,
    food_intake_condition, // opcional
    product_name,
  } = data;

  if (!recommended_dose || !dose_unit) {
    throw new Error("indications_with_dose: recommended_dose y dose_unit son obligatorios.");
  }
  if (!administration_route) {
    throw new Error("indications_with_dose: administration_route es obligatorio.");
  }

  const listado = indications_list({ indications }); // reutiliza la regla anterior

  let texto = `${listado} a una dosis recomendada de ${recommended_dose} ${dose_unit} una vez al día. `
            + `${product_name} es para uso por vía ${administration_route}.`;

  // La cláusula de alimentos es condicional: solo se agrega si el dato existe.
  if (food_intake_condition) {
    texto += ` ${food_intake_condition}.`;
  }

  return texto;
}

// =============================================================================
// 5. spontaneous_reports
//    Placeholder: [pfSRAentry]
//    Regla de plural/singular sobre el conteo de reportes espontáneos recibidos.
// =============================================================================
function spontaneous_reports(data) {
  const total = Number(data.total_reports);
  const product = data.product_name;

  if (Number.isNaN(total) || total < 0) {
    throw new Error("spontaneous_reports: total_reports debe ser un número >= 0.");
  }

  if (total === 0) {
    return `no se ha recibido ningún reporte proveniente de notificación espontánea en referencia a ${product}`;
  }

  if (total === 1) {
    return `se ha recibido 1 reporte proveniente de notificación espontánea en referencia a ${product}`;
  }

  return `se han recibido ${total} reportes provenientes de notificación espontánea en referencia a ${product}`;
}

// =============================================================================
// 6. exposed_patients_calc / exposed_patients_summary
//    Placeholder: [exposed_patients_summary]
//    Cálculo:  pacientes_expuestos = (unidades_vendidas * presentación) / DDD
//    Caso SIN unidades vendidas -> "no ha podido ser estimado..."
//    Caso CON unidades vendidas -> "se ha estimado en {N} pacientes"
// =============================================================================

/**
 * Calcula pacientes expuestos para UNA presentación.
 * Devuelve { soldUnitsLabel, exposedPatientsLabel, exposedPatientsValue }
 * exposedPatientsValue = null cuando no hay unidades vendidas (no se puede estimar).
 */
function exposed_patients_calc(presentation) {
  const { units_sold, ddd_value, presentation_name } = presentation;

  const hasSales = units_sold !== null && units_sold !== undefined && Number(units_sold) > 0;

  if (!hasSales) {
    return {
      soldUnitsLabel: "Sin unidades comercializadas",
      exposedPatientsLabel: "No determinado",
      exposedPatientsValue: null,
    };
  }

  // ddd_value puede venir como "800mg"; se extrae la parte numérica para el cálculo.
  const dddNumber = parseFloat(String(ddd_value).replace(/[^\d.]/g, ""));
  const presentationNumber = parseFloat(String(presentation_name).replace(/[^\d.]/g, ""));

  if (!dddNumber) {
    throw new Error(`exposed_patients_calc: no se pudo interpretar la DDD numérica de "${ddd_value}".`);
  }

  const value = Math.round((Number(units_sold) * (presentationNumber || 1)) / dddNumber);

  return {
    soldUnitsLabel: Number(units_sold).toLocaleString("es-PE"),
    exposedPatientsLabel: value.toLocaleString("es-PE"),
    exposedPatientsValue: value,
  };
}

/**
 * Resuelve la frase del Resumen Ejecutivo sobre pacientes expuestos en
 * post-comercialización, sumando el resultado de todas las presentaciones.
 * Si NINGUNA presentación tiene ventas -> redacción "no estimado".
 * Si AL MENOS UNA tiene ventas -> redacción "se ha estimado en N pacientes"
 * (N = suma de pacientes expuestos de las presentaciones con dato).
 */
function exposed_patients_summary(data) {
  const { presentations, product_name } = data;

  if (!Array.isArray(presentations) || presentations.length === 0) {
    throw new Error("exposed_patients_summary: se requiere al menos 1 presentación.");
  }

  const calculos = presentations.map(exposed_patients_calc);
  const conVentas = calculos.filter((c) => c.exposedPatientsValue !== null);

  if (conVentas.length === 0) {
    return `el número de pacientes expuestos durante la post-comercialización para ${product_name} `
         + `no ha podido ser estimado debido a que no se han registrado unidades comercializadas`;
  }

  const total = conVentas.reduce((sum, c) => sum + c.exposedPatientsValue, 0);

  return `el número de pacientes expuestos durante la post-comercialización para ${product_name} `
       + `se ha estimado en ${total.toLocaleString("es-PE")} pacientes`;
}

// =============================================================================
// 7. last_minute_information
//    Placeholder: [last_minute_info]
//    Frase de la sección "INFORMACIÓN DE ÚLTIMO MOMENTO".
//    post_dlp_window_days es opcional: si no se provee, se omite esa cláusula.
// =============================================================================
function last_minute_information(data) {
  const { product_name, period_start, period_end, post_dlp_window_days } = data;

  if (!period_start || !period_end) {
    throw new Error("last_minute_information: period_start y period_end son obligatorios.");
  }

  const periodo = `[${period_start}] hasta [${period_end}]`;

  if (post_dlp_window_days) {
    return `No se recibieron hallazgos de seguridad, eficacia o efectividad potencialmente importantes `
         + `con respecto a ${product_name} en los ${post_dlp_window_days} días posteriores al período `
         + `cubierto en este IPS ${periodo}.`;
  }

  return `No se recibieron hallazgos de seguridad, eficacia o efectividad potencialmente importantes `
       + `con respecto a ${product_name} en el período cubierto en este IPS ${periodo}.`;
}

// =============================================================================
// Utilitario adicional (no es un "template" del catálogo, pero lo usan varios
// templates de tabla): formatea fecha dd-mmm-yyyy -> dd/mm/yyyy para Tabla 1
// y Anexo de Estatus Regulatorio.
// =============================================================================
function formatDateForTables(ddMmmYyyy) {
  return toSlashDate(ddMmmYyyy);
}

// =============================================================================
// Registro de templates: mapea el string "template" del catálogo a la función
// que debe ejecutarse. El motor de sustitución simplemente hace:
//   const fn = TEMPLATES[paragraph.template];
//   const text = fn(buildInputsFor(paragraph, formData));
//   replaceAll(document, paragraph.placeholder, text);
// =============================================================================
const TEMPLATES = {
  local_birth_date,
  ips_ordinal,
  indications_list,
  indications_with_dose,
  spontaneous_reports,
  exposed_patients_summary,
  last_minute_information,
};

module.exports = {
  TEMPLATES,
  // se exportan también sueltas por si se necesitan fuera del registro
  local_birth_date,
  ips_ordinal,
  indications_list,
  indications_with_dose,
  spontaneous_reports,
  exposed_patients_calc,
  exposed_patients_summary,
  last_minute_information,
  formatDateForTables,
};
