import express from 'express';
import * as casesController from '../controllers/ips-cases.controller.js';

const router = express.Router();

// Base path will be: /api/ips-cases

// Get all cases for a workspace
router.get('/workspace/:workspaceId', casesController.getWorkspaceCases);

// Create a new case
router.post('/', casesController.createCase);

// Get all versions for a case
router.get('/:caseId/versions', casesController.getCaseVersions);

// Create next version inherited from previous
router.post('/:caseId/versions', casesController.createNextVersion);

// Get specific version (to edit form)
router.get('/versions/:versionId', casesController.getVersion);

// AutoSave / Update specific version
router.put('/versions/:versionId', casesController.updateVersion);

// Delete a case
router.delete('/:id', casesController.deleteCase);

export default router;
