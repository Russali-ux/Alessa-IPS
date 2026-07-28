export function parseVigiaccessHTML(htmlString) {
    if (!htmlString) return [];

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");
        
        const items = doc.querySelectorAll('span[dtid="dashboard-socrow"]');
        const rows = [];

        items.forEach(item => {
            const text = item.textContent || "";
            // Clean invisible characters
            const clean = text.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, "");
            
            // Expected format: SOC (xx%, xxxx ADRs)
            const match = clean.match(/^(.*?)\s*\((.*?)%,\s*(.*?)\s*ADRs\)$/i);
            
            if (match) {
                const soc = match[1].trim();
                const percentage = Number(match[2]);
                const adrsStr = match[3].replace(/\D/g, "");
                const adrs = Number(adrsStr);
                
                rows.push({
                    soc,
                    percentage,
                    adrs
                });
            } else {
                // Fallback attempt if format varies slightly
                const parts = clean.split('(');
                if(parts.length >= 2) {
                    const soc = parts[0].trim();
                    const inner = parts[1].replace(')', '');
                    const innerParts = inner.split(',');
                    if (innerParts.length >= 2) {
                        const pctStr = innerParts[0].replace('%', '').trim();
                        const adrsStr = innerParts[1].replace('ADRs', '').replace(/\D/g, '').trim();
                        
                        rows.push({
                            soc,
                            percentage: Number(pctStr) || 0,
                            adrs: Number(adrsStr) || 0
                        });
                    }
                }
            }
        });

        return rows;
    } catch (error) {
        console.error("Error parsing Vigiaccess HTML:", error);
        return [];
    }
}
