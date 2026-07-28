/**
 * Mapea los campos devueltos por Zotero a las columnas esperadas por la Sección E de AlessaIPS.
 */
export const mapZoteroItemToAlessaRow = (zoteroItem) => {
  const data = zoteroItem.data;
  
  // Extraer autores
  const authors = (data.creators || [])
    .filter(c => c.creatorType === 'author')
    .map(c => {
      if (c.lastName && c.firstName) return `${c.lastName}, ${c.firstName}`;
      if (c.lastName) return c.lastName;
      if (c.name) return c.name;
      return '';
    })
    .filter(Boolean)
    .join('; ');

  // Extraer año y mes (YYYY y MMM) de la fecha
  let yyyy = '';
  let mmm = '';
  const dateStr = data.date || '';
  if (dateStr) {
    const matchYear = dateStr.match(/\b(19|20)\d{2}\b/);
    if (matchYear) yyyy = matchYear[0];
    // Mes simple
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (const m of months) {
      if (dateStr.toLowerCase().includes(m.toLowerCase())) {
        mmm = m;
        break;
      }
    }
  }

  // Extraer PMID de 'extra' si existe: e.g. "PMID: 123456"
  let pmid = '';
  if (data.extra) {
    const pmidMatch = data.extra.match(/PMID:\s*(\d+)/i);
    if (pmidMatch) pmid = pmidMatch[1];
  }

  return {
    _id: `zotero_${zoteroItem.key}_${Date.now()}`, // ID único
    PMID: pmid || data.archiveLocation || "N/A",
    TI: data.title || "N/A",
    AU: authors || "N/A",
    YYYY: yyyy || "N/A",
    MMM: mmm || "N/A",
    AB: data.abstractNote || "N/A",
    JT: data.publicationTitle || data.journalAbbreviation || "N/A",
    PT: data.itemType || "N/A",
    DP: data.date || "N/A",
    DOI: data.DOI || "N/A",
    URL: data.url || "N/A",
    inclusion: "N/A" // Valor por defecto
  };
};
