import express from 'express';
import { requireWorkspace, authenticateToken, requireRole, requireSuperAdmin } from '../middlewares/auth.middleware.js';
import * as workspacesController from '../controllers/workspaces.controller.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// Admin endpoints (for workspace admins to get their own managed workspaces)
router.get('/my-admin', workspacesController.getAdminWorkspaces);

// SuperAdmin endpoints
router.get('/all', requireSuperAdmin, workspacesController.getAllWorkspaces);
router.post('/', requireSuperAdmin, upload.fields([{ name: 'templateWord', maxCount: 1 }, { name: 'inventoryExcel', maxCount: 1 }]), workspacesController.createWorkspace);
router.put('/:id', requireSuperAdmin, upload.fields([{ name: 'templateWord', maxCount: 1 }, { name: 'inventoryExcel', maxCount: 1 }]), workspacesController.updateWorkspace);

// Workspace context endpoints
router.use(requireWorkspace);
router.get('/current', workspacesController.getCurrentWorkspace);
router.put('/current', requireRole(['SUPER_ADMIN', 'WORKSPACE_ADMIN']), upload.fields([{ name: 'templateWord', maxCount: 1 }, { name: 'inventoryExcel', maxCount: 1 }]), workspacesController.updateWorkspace);

export default router;
