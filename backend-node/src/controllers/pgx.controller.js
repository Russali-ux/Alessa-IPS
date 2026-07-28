import axios from 'axios';
import crypto from 'crypto';

// In-memory cache for PGx API requests
const pgxCache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

const CLINPGX_API_BASE = 'https://api.clinpgx.org/v1/data';

/**
 * Controller to fetch Pharmacogenomics data for a specific drug.
 * Proxies to ClinPGx API and returns a simplified summary.
 */
export const getDrugAnnotations = async (req, res) => {
    try {
        const { drug } = req.query;
        if (!drug) {
            return res.status(400).json({ message: 'Drug parameter is required' });
        }

        const normalizedDrug = drug.toLowerCase().trim();

        // 1. Check Cache
        if (pgxCache.has(normalizedDrug)) {
            const cached = pgxCache.get(normalizedDrug);
            if (Date.now() - cached.timestamp < CACHE_TTL) {
                return res.json(cached.data);
            }
            pgxCache.delete(normalizedDrug);
        }

        // 2. Fetch data from ClinPGx (Clinical Annotations + Drug Labels)
        let clinicalData = [];
        let labelData = [];
        
        try {
             const [clinRes, labelRes] = await Promise.allSettled([
                 axios.get(`${CLINPGX_API_BASE}/clinicalAnnotation`, { params: { 'relatedChemicals.name': normalizedDrug } }),
                 axios.get(`${CLINPGX_API_BASE}/drugLabel`, { params: { 'relatedChemicals.name': normalizedDrug } })
             ]);

             if (clinRes.status === 'fulfilled' && clinRes.value.data?.data) {
                 clinicalData = clinRes.value.data.data;
             }
             if (labelRes.status === 'fulfilled' && labelRes.value.data?.data) {
                 labelData = labelRes.value.data.data;
             }
        } catch (apiError) {
             console.error(`Error calling ClinPGx API for ${drug}:`, apiError.message);
        }

        // 3. Transform data into the expected Dashboard format for AlessaIPS
        const genes = new Set();
        let maxEvidence = 'Unassigned';
        let labelFDA = false;
        let labelEMA = false;
        const annotations = [];

        // Process Clinical Annotations
        clinicalData.forEach(ann => {
             const geneSymbol = ann.relatedGenes?.[0]?.symbol || 'Desconocido';
             if (geneSymbol !== 'Desconocido') genes.add(geneSymbol);
             
             const level = ann.evidenceLevel || 'Unknown';
             if (level.includes('1A') || level.includes('1B')) maxEvidence = level;
             
             annotations.push({
                 id: ann.id || ann.accessionId,
                 gene: geneSymbol,
                 phenotype: ann.phenotypes?.join(', ') || (ann.allelePhenotypes ? 'Múltiples fenotipos' : 'No especificado'),
                 evidence: level,
                 recommendation: ann.text || 'Anotación Clínica. Revisar guías.',
                 source: 'ClinPGx'
             });
        });

        // Process Drug Labels
        labelData.forEach(lbl => {
            const isFDA = lbl.name && lbl.name.includes('FDA');
            const isEMA = lbl.name && lbl.name.includes('EMA');
            const pgxLevel = lbl.testing?.term;
            
            if (isFDA) labelFDA = true;
            if (isEMA) labelEMA = true;
            
            // Extract genes from name if available (e.g. "... for palbociclib and ERBB2, ESR1...")
            let geneText = 'Varios';
            if (lbl.name && lbl.name.includes(' and ')) {
                const parts = lbl.name.split(' and ');
                if (parts.length > 1) {
                    geneText = parts[1].trim();
                    // Basic parsing to add to unique genes
                    geneText.split(',').map(g => g.trim()).forEach(g => genes.add(g));
                }
            }
            
            annotations.push({
                 id: lbl.id,
                 gene: geneText,
                 phenotype: 'Etiqueta Regulatoria',
                 evidence: pgxLevel || (isFDA ? 'FDA Label' : (isEMA ? 'EMA Label' : 'Regulatorio')),
                 testingLevel: pgxLevel || null, // Guardamos el nivel de test para los colores en UI
                 recommendation: lbl.name || 'Etiqueta de fármaco con información genómica.',
                 source: isFDA ? 'FDA' : (isEMA ? 'EMA' : 'Agencia Reguladora')
            });
        });

        const summary = {
            ifa: drug,
            consultationDate: new Date().toISOString(),
            genesAssociated: Array.from(genes),
            annotationsCount: annotations.length,
            labelFDA: labelFDA,
            labelEMA: labelEMA,
            maxEvidence: annotations.length > 0 ? (maxEvidence !== 'Unassigned' ? maxEvidence : 'Etiqueta') : 'N/A',
            annotations: annotations,
        };

        // Generate hash to detect changes
        const contentHash = crypto.createHash('sha256').update(JSON.stringify(summary)).digest('hex');
        
        const finalResponse = {
            ...summary,
            hash: contentHash
        };

        // 4. Save to Cache
        pgxCache.set(normalizedDrug, {
            timestamp: Date.now(),
            data: finalResponse
        });

        return res.json(finalResponse);

    } catch (error) {
        console.error('PGx Controller Error:', error);
        res.status(500).json({ message: 'Internal Server Error processing PGx data' });
    }
};
