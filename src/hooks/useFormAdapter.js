import { useState, useEffect } from 'react';
import { fetchWithAuth, API_URL, handleResponse } from '../services/api';

/**
 * Custom hook to adapt structured JSONB from the backend 
 * into a flat object for the form, and repackage it for saving.
 */
export function useFormAdapter(versionId) {
    const [loading, setLoading] = useState(!!versionId);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState(null); // the original structured data
    const [flatData, setFlatData] = useState({}); // the flat data for UI
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!versionId) return;

        const loadVersion = async () => {
            try {
                setLoading(true);
                
                // 1. Comprobar recuperación
                let isRecovery = false;
                const recoveryDraftStr = localStorage.getItem('alessa_ips_recovery_draft');
                if (recoveryDraftStr) {
                    try {
                        const parsedRecovery = JSON.parse(recoveryDraftStr);
                        if (parsedRecovery.path === window.location.pathname) {
                            isRecovery = true;
                            // Restaurar los datos al sessionStorage para que los componentes los lean
                            Object.entries(parsedRecovery.data).forEach(([key, val]) => {
                                sessionStorage.setItem(key, val);
                            });
                            // Despachar evento para notificar al Layout
                            window.dispatchEvent(new CustomEvent('draft-recovered'));
                            // Limpiar el borrador del localStorage
                            localStorage.removeItem('alessa_ips_recovery_draft');
                        }
                    } catch (e) {}
                }

                const data = await fetchWithAuth(`${API_URL}/ips-cases/versions/${versionId}`).then(handleResponse);
                
                const structuredData = data.form_data || {
                    metadata: {}, master: {}, version: {}, editable: {}, accumulated: {}, snapshot: {}, derived: {}
                };
                
                setFormData(structuredData);

                // Flatten it for the UI, supporting both new nested format and legacy flat format
                const flat = {
                    ...structuredData, // Fallback for legacy flat data
                    ...(structuredData.master || {}),
                    ...(structuredData.version || {}),
                    ...(structuredData.editable || {}),
                    ...(structuredData.accumulated || {}),
                    ...(structuredData.snapshot || {}),
                    ...(structuredData.derived || {})
                };
                
                // Si es recuperación, evitamos sobreescribir el sessionStorage con la data vieja del backend
                if (!isRecovery) {
                const sections = [
                    "seccionA_formData",
                    "seccionB_formData",
                    "seccionC_formData",
                    "seccionD_formData",
                    "seccionE_analyses",
                    "seccionG_vigiaccessData"
                ];

                const sectionMappings = {
                    "seccionA_formData": ['clienteId', 'trsName', 'uvsName', 'direccion', 'templatePath', 'elaborador', 'ifaName', 'productName', 'isGeneric', 'codigoIps', 'ipsNumero', 'ipsTexto', 'pais', 'arnName', 'fechaInicioDatos', 'fcd', 'fechaLimite', 'aniosPeriodo', 'fechaNacimientoLocal', 'hasDdd', 'atcGroup', 'atcCode', 'mecanismoAccion', 'formaAdministracion', 'productosList', 'dddList', 'indicacionesList'],
                    "seccionB_formData": ['usoInvestigacion', 'detalleInvestigacion', 'usoComercializacion', 'detalleComercializacion', 'huboCambiosSeguridad', 'tablaCambios', 'tablaAcciones'],
                    "seccionC_formData": ['huboExpEstudiosClinicos', 'estudiosClinicosList', 'huboUnidadesComercializadas', 'postComercializacionList'],
                    "seccionD_formData": ['huboRAM', 'ramList', 'ramSummary'],
                    "seccionE_analyses": [] // Only AI results, typically no form data
                };

                sections.forEach(secKey => {
                    try {
                        const currentStr = sessionStorage.getItem(secKey);
                        const parsed = currentStr ? JSON.parse(currentStr) : {};
                        
                        // We take whatever was in sessionStorage and overwrite it with fresh backend data,
                        // BUT only for the keys that this specific section is responsible for.
                        // If it's the first load, parsed is empty, and we populate it with backend data.
                        const mergedForSec = { ...parsed };
                        
                        if (secKey === "seccionE_analyses") {
                            // Recover nested analysesData
                            if (flat.analysesData) {
                                Object.assign(mergedForSec, flat.analysesData);
                            }
                            // Recover old drafts where dynamic keys ("0", "1") were at the root
                            // ONLY if they haven't been cleanly saved in analysesData yet
                            Object.keys(flat).forEach(k => {
                                if (!isNaN(Number(k)) && String(k).trim() !== "") {
                                    if (!flat.analysesData || flat.analysesData[k] === undefined) {
                                        mergedForSec[k] = flat[k];
                                    }
                                }
                            });
                        } else if (secKey === "seccionG_vigiaccessData") {
                            if (flat.vigiaccessData) {
                                Object.assign(mergedForSec, flat.vigiaccessData);
                            }
                        } else if (sectionMappings[secKey]) {
                            sectionMappings[secKey].forEach(k => {
                                if (flat[k] !== undefined) {
                                    mergedForSec[k] = flat[k];
                                }
                            });
                        }
                        
                        sessionStorage.setItem(secKey, JSON.stringify(mergedForSec));
                    } catch(e) {}
                });
                }
                
                setFlatData(flat);
            } catch (err) {
                console.error("Error loading version:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        loadVersion();
    }, [versionId]);

    // This function receives changes from the UI and repacks them
    // into the structured JSONB based on a mapping (or dynamically).
    // In a real scenario, you define a map of which field belongs to which section.
    // For now, we assume any new/changed field belongs to 'editable' unless 
    // it's explicitly a 'version' or 'master' field, but since the user requested
    // strict separation, we'd ideally map fields.
    // For the sake of simplicity, we'll merge everything modified into editable for now,
    // EXCEPT known master/version fields.
    const handleChange = (key, value) => {
        setFlatData(prev => ({ ...prev, [key]: value }));
    };

    const saveBorrador = async (status = "Borrador") => {
        if (!versionId || !formData) return;
        setIsSaving(true);
        
        try {
            const repackaged = { 
                ...formData,
                master: { ...(formData.master || {}) },
                version: { ...(formData.version || {}) },
                editable: { ...(formData.editable || {}) },
                accumulated: { ...(formData.accumulated || {}) },
                snapshot: { ...(formData.snapshot || {}) },
                derived: { ...(formData.derived || {}) }
            };
            
            // Example of strict mapping:
            const masterKeys = ['empresa', 'clienteId', 'trsName', 'uvsName', 'direccion', 'producto', 'ifaName', 'productName', 'arnName', 'pais', 'atcCode', 'atcGroup', 'hasDdd', 'dddList', 'productosList', 'indicacionesList', 'mecanismoAccion', 'formaAdministracion'];
            const versionKeys = ['codigoIps', 'ipsNumero', 'ipsTexto', 'fechaInicioDatos', 'fcd', 'aniosPeriodo', 'fechaLimite', 'elaborador'];
            const accumulatedKeys = ['postComercializacionList', 'ramSummary'];
            // Sync from sessionStorage before repackaging
            const sections = [
                "seccionA_formData",
                "seccionB_formData",
                "seccionC_formData",
                "seccionD_formData",
                "seccionE_analyses",
                "seccionG_vigiaccessData"
            ];
            
            let mergedData = { ...flatData };
            
            // Clean up old scattered numeric keys from flatData so they don't bloat the payload forever
            Object.keys(mergedData).forEach(k => {
                if (!isNaN(Number(k)) && String(k).trim() !== "") {
                    delete mergedData[k];
                }
            });

            sections.forEach(secKey => {
                try {
                    const str = sessionStorage.getItem(secKey);
                    if (str) {
                        const parsed = JSON.parse(str);
                        if (secKey === "seccionE_analyses") {
                            mergedData["analysesData"] = parsed;
                        } else if (secKey === "seccionG_vigiaccessData") {
                            mergedData["vigiaccessData"] = parsed;
                        } else {
                            mergedData = { ...mergedData, ...parsed };
                        }
                    }
                } catch (e) {
                    console.error("Error reading sessionStorage", e);
                }
            });

            // Re-assign mergedData to proper bins
            Object.keys(mergedData).forEach(key => {
                const val = mergedData[key];
                if (masterKeys.includes(key)) {
                    repackaged.master[key] = val;
                } else if (versionKeys.includes(key)) {
                    repackaged.version[key] = val;
                } else if (accumulatedKeys.includes(key)) {
                    repackaged.accumulated[key] = val;
                } else {
                    // Everything else goes to editable
                    repackaged.editable[key] = val;
                }
            });

            await fetchWithAuth(`${API_URL}/ips-cases/versions/${versionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ form_data: repackaged, status })
            }).then(handleResponse);

            setFormData(repackaged);
            
            return true; // Success
        } catch (err) {
            console.error("Error saving borrador:", err);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    return {
        flatData,
        loading,
        error,
        isSaving,
        handleChange,
        saveBorrador,
        originalData: formData
    };
}
