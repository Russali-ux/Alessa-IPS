import * as caseService from '../services/ips-cases.service.js';

export const getWorkspaceCases = async (req, res) => {
    try {
        const workspaceId = req.params.workspaceId;
        const cases = await caseService.getCasesByWorkspace(workspaceId);
        res.json(cases);
    } catch (error) {
        console.error('Error in getWorkspaceCases:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createCase = async (req, res) => {
    try {
        const { workspace_id, product_id, schedule_id, initial_data, status } = req.body;
        const userId = req.user.id; // from auth middleware

        const result = await caseService.createCase(workspace_id, product_id, schedule_id, initial_data || {}, userId, status);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error in createCase:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getCaseVersions = async (req, res) => {
    try {
        const caseId = req.params.caseId;
        const versions = await caseService.getCaseVersions(caseId);
        res.json(versions);
    } catch (error) {
        console.error('Error in getCaseVersions:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getVersion = async (req, res) => {
    try {
        const versionId = req.params.versionId;
        const version = await caseService.getVersionById(versionId);
        if (!version) return res.status(404).json({ message: 'Version not found' });
        res.json(version);
    } catch (error) {
        console.error('Error in getVersion:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateVersion = async (req, res) => {
    try {
        const versionId = req.params.versionId;
        const { form_data, status } = req.body;
        const userId = req.user.id;

        const updated = await caseService.updateVersionData(versionId, form_data, userId, status);
        res.json(updated);
    } catch (error) {
        console.error('Error in updateVersion:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createNextVersion = async (req, res) => {
    try {
        const caseId = req.params.id;
        const previousVersionId = req.body.previous_version_id;
        const newVersionData = req.body.new_version_data;
        const userId = req.user.id;

        const result = await caseService.createNextVersion(caseId, previousVersionId, newVersionData, userId);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error in createNextVersion:', error);
        res.status(500).json({ error: 'Error al generar nueva versión' });
    }
};

export const deleteCase = async (req, res) => {
    try {
        const caseId = req.params.id;
        await caseService.deleteCase(caseId);
        res.json({ success: true, message: 'Expediente eliminado correctamente' });
    } catch (error) {
        console.error('Error in deleteCase:', error);
        res.status(500).json({ error: 'Error al eliminar expediente' });
    }
};
