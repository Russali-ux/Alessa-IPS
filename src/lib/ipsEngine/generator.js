import { TEMPLATES } from './ips_paragraph_rules';
import catalog from './ips_catalog.json';

/**
 * Recopila los estados guardados en sessionStorage y genera el diccionario
 * de reemplazos para enviar al backend.
 */

function formatToDddMmmYyyy(dateStr) {
  if (!dateStr || dateStr === "___") return "___";
  
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  let day, monthIndex, year;

  // Intentar formato ISO o YYYY-MM-DD
  if (String(dateStr).includes('T') || String(dateStr).match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        day = String(d.getUTCDate()).padStart(2, '0');
        monthIndex = d.getUTCMonth();
        year = d.getUTCFullYear();
        return `${day}-${months[monthIndex]}-${year}`;
      }
    } catch(e) {}
  }

  // Intentar formato DD-MM-YYYY o DD/MM/YYYY
  const match = String(dateStr).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    day = match[1].padStart(2, '0');
    monthIndex = parseInt(match[2], 10) - 1;
    year = match[3];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day}-${months[monthIndex]}-${year}`;
    }
  }
  
  return dateStr;
}

export function buildReplacements() {
  // 1. Obtener estados de las secciones
  const secA = JSON.parse(sessionStorage.getItem("seccionA_formData") || "{}");
  const secB = JSON.parse(sessionStorage.getItem("seccionB_formData") || "{}");
  const secC = JSON.parse(sessionStorage.getItem("seccionC_formData") || "{}");
  const secD = JSON.parse(sessionStorage.getItem("seccionD_formData") || "{}");

  // 2. Mapear al "data" estructurado que espera ips_paragraph_rules
  const primerProducto = secA.productosList?.[0] || {};
  
  // Construir array de "presentations" cruzando A y C (si existe)
  const presentations = (secA.productosList || []).map((p, index) => {
    // Buscar si hay datos en Sección C para este RS
    const prodC = (secC.tablaConsumo || []).find(c => c.rs === p.rs) || {};
    return {
      presentation_name: `${p.presentacion} ${p.formaFarmaceutica}`, // aproximación
      pharma_form: p.presentacion || "Forma Farmacéutica", // Recordar que estaban invertidos en UI
      sanitary_registry: p.rs || "RS-000",
      local_auth_date: p.fechaNacLocal ? `[${formatToDddMmmYyyy(p.fechaNacLocal)}]` : "[01-Ene-2000]",
      country: p.pais || secA.pais || "Perú",
      brand_name: p.nombreComercial || secA.productName || "Producto",
      units_sold: prodC.unidadesVendidas || 0,
      ddd_value: prodC.ddd || "1mg",
      ddd_route: "Oral" // Faltante
    };
  });

  const indicationsList = (secA.indicacionesList || []).map(i => i.indicacion).filter(Boolean);

  const data = {
    product_name: secA.isGeneric ? secA.ifaName : (secA.productName || "Producto"),
    ifa_name: secA.ifaName || "IFA",
    pv_unit_name: secA.uvsName || "Área de Farmacovigilancia",
    trs_name: secA.trsName || "Titular RS",
    data_lock_point: `[${formatToDddMmmYyyy(secA.fcd) || "01-Ene-2000"}]`,
    international_birth_date: `[${formatToDddMmmYyyy(primerProducto.fechaIbd) || "01-Ene-2000"}]`,
    atc_group: secA.atcGroup || "Grupo ATC",
    atc_code: secA.atcCode || "A00AA00",
    regulatory_authority: secA.arnName || "DIGEMID",
    ips_revision_number: secA.ipsNumero || 1,
    ips_code: secA.codigoIps || `IPS_${(secA.isGeneric ? secA.ifaName : secA.productName || "PROD").toUpperCase()}_0${secA.ipsNumero || 1}`,
    covered_period: `[${formatToDddMmmYyyy(secA.fechaInicioDatos) || "___"}] hasta [${formatToDddMmmYyyy(secA.fcd) || "___"}]`,
    
    // Seccion A.3 y A.4 y A.5
    indicaciones_posologia: secA.indicacionesList || [],
    mecanismo_accion: secA.mecanismoAccion || "Mecanismo de acción no especificado",
    forma_administracion: secA.formaAdministracion || "Forma de administración no especificada",
    
    prepared_by: "POR DEFINIR",
    prepared_by_role: "POR DEFINIR",
    prepared_by_email: "por.definir@example.com",
    prepared_date: "01-Ene-2000",
    reviewed_by: "POR DEFINIR",
    reviewed_date: "01-Ene-2000",
    approved_by: "POR DEFINIR",
    approved_date: "01-Ene-2000",
    
    presentations: presentations.length > 0 ? presentations : [{
      presentation_name: "200mg Tableta",
      pharma_form: "Tableta",
      sanitary_registry: "RS-000",
      local_auth_date: "01-Ene-2000",
      units_sold: 0,
      ddd_value: "1mg",
      ddd_route: "Oral"
    }],
    indications: indicationsList.length > 0 ? indicationsList : ["Indicación 1", "Indicación 2"],
    
    // Faltantes para posología
    recommended_dose: "Dosis Recomendada",
    dose_unit: "mg",
    administration_route: "Oral",
    food_intake_condition: "con las comidas",
    
    total_reports: secD.tablaCasos ? secD.tablaCasos.length : 0,
    period_start: secA.fechaInicioDatos || "01-Ene-2000",
    period_end: secA.fechaLimite || "01-Ene-2000",
    post_dlp_window_days: "30" // opcional
  };

  // 3. Resolver Variables Simples
  const replacements = {};
  for (const v of catalog.variables) {
    replacements[v.placeholder] = data[v.formField] || v.default || v.example || `[${v.formField}]`;
  }

  // 4. Resolver Párrafos con Reglas
  for (const p of catalog.paragraphs) {
    const fn = TEMPLATES[p.template];
    if (fn) {
      try {
        replacements[p.placeholder] = fn(data);
      } catch (err) {
        console.warn(`Error ejecutando template '${p.template}':`, err);
        replacements[p.placeholder] = `[Error en ${p.template}: Falta Información]`;
      }
    }
  }

  return replacements;
}


export function buildTables() {
  const secA = JSON.parse(sessionStorage.getItem("seccionA_formData") || "{}");
  const secC = JSON.parse(sessionStorage.getItem("seccionC_formData") || "{}");
  
  const tables = {};
  
  if (secA.productosList && Array.isArray(secA.productosList)) {
    let pfIndic1Text = "N/A";
    if (TEMPLATES && TEMPLATES.indications_list) {
      const indicationsStrings = (secA.indicacionesList || []).map(ind => ind.indicacion || "");
      pfIndic1Text = TEMPLATES.indications_list({ indications: indicationsStrings });
    }

    tables["[TABLE_01]"] = secA.productosList.map((p, idx) => ({
      pais: secA.pais || "Perú",
      nombreComercial: p.nombreComercial || "N/A",
      indicacionTerapeutica: idx === 0 ? pfIndic1Text : "",
      fechaAutorizacion: p.fechaNacLocal ? formatToDddMmmYyyy(p.fechaNacLocal) : "N/A"
    }));

    tables["[TABLE_REG]"] = secA.productosList.map((p, idx) => ({
      pais: secA.pais || "Perú",
      principioActivo: secA.ifaName || "N/A",
      nombreComercial: p.nombreComercial || "N/A",
      formaFarmaceutica: p.formaFarmaceutica || "N/A",
      viaAdministracion: secA.formaAdministracion || "N/A",
      estatusRegulatorio: "VIGENTE",
      fechaAutorizacion: p.fechaNacLocal ? formatToDddMmmYyyy(p.fechaNacLocal) : "N/A",
      indicacionesUso: idx === 0 ? pfIndic1Text : ""
    }));

    tables["[TABLE_PRINCIP]"] = secA.productosList.map(p => ({
      nombreComercial: p.nombreComercial || "N/A",
      formaFarmaceutica: p.formaFarmaceutica || "N/A",
      presentacion: p.presentacion || "N/A",
      registroSanitario: p.rs || "N/A",
      periodoIPS: `[${formatToDddMmmYyyy(secA.fechaInicioDatos) || "___"}] hasta [${formatToDddMmmYyyy(secA.fcd) || "___"}]`,
      fechaIBD: `[${formatToDddMmmYyyy(p.fechaIbd) || "___"}]`,
      fechaAutorizacionLocal: `[${formatToDddMmmYyyy(p.fechaNacLocal) || "___"}]`
    }));
  }
  
  if (secC.postComercializacionList && Array.isArray(secC.postComercializacionList)) {
    const huboUnidadesGlobal = (secC.huboUnidadesComercializadas || "").toUpperCase() === "SÍ" || (secC.huboUnidadesComercializadas || "").toUpperCase() === "SI";
    
    tables["[TABLE_EXPOSURE]"] = secC.postComercializacionList.map(p => {
      let unidades = String(p.unidadesVendidas || "0");
      let pacientes = String(p.pacientesExpuestos || "No determinado");
      
      const numUnidades = parseFloat(unidades) || 0;
      
      if (!huboUnidadesGlobal || numUnidades === 0) {
        unidades = "Sin unidades comercializadas";
        pacientes = "No determinado";
      }
      
      return {
        pais: secA.pais || "Perú",
        registroSanitario: p.rs || "N/A",
        presentacionProducto: p.presentacion || "N/A",
        unidadesVendidas: unidades,
        ddd: p.ddd || "N/A",
        pacientesExpuestos: pacientes
      };
    });
  }
  
  return tables;
}

export function buildSections() {
  const secA = JSON.parse(sessionStorage.getItem("seccionA_formData") || "{}");
  const secE = JSON.parse(sessionStorage.getItem("seccionE_analyses") || "{}");
  
  const ifa = secA.ifaName || "IFA";
  const brand = secA.productName || "Producto";
  const indicacionesList = secA.indicacionesList || [];
  
  // Construir la estructura unificada
  const indicaciones = indicacionesList.map((ind, index) => {
    const analysisData = secE[index] || { data: [] };
    const articles = (analysisData.data || [])
      .filter(row => row.inclusion === "incluido")
      .map(row => ({
        title: row.TI || "Sin título",
        summary: row.claudeResponse || "Sin resumen disponible"
      }));
      
    return {
      title: ind.indicacion || `Indicación ${index + 1}`,
      recommendedDose: ind.posologia || "Dosis recomendada no especificada",
      articles: articles,
      globalAnalysis: "" // Placeholder, ya que el análisis global se genera bajo demanda
    };
  });
  
  return {
    "[SECTION_BENEFIT_CHARACTERIZATION]": {
      "renderer": "benefit_characterization",
      "data": { "indicaciones": indicaciones }
    },
    "[SECTION_BR_CONTEXT]": {
      "renderer": "benefit_risk_context",
      "data": { "indicaciones": indicaciones }
    },
    "[SECTION_BR_ANALYSIS]": {
      "renderer": "benefit_risk_analysis",
      "data": { "indicaciones": indicaciones, "ifa": ifa, "brand": brand }
    }
  };
}
