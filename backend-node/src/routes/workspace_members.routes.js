import express from 'express';
import { requireWorkspace, authenticateToken, requireRole } from '../middlewares/auth.middleware.js';
import * as membersController from '../controllers/workspace_members.controller.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireWorkspace);

router.get('/', requireRole(['SUPER_ADMIN', 'WORKSPACE_ADMIN']), membersController.getWorkspaceMembers);
router.post('/', requireRole(['SUPER_ADMIN', 'WORKSPACE_ADMIN']), membersController.addWorkspaceMember);
router.put('/:userId/role', requireRole(['SUPER_ADMIN', 'WORKSPACE_ADMIN']), membersController.updateMemberRole);
router.delete('/:userId', requireRole(['SUPER_ADMIN', 'WORKSPACE_ADMIN']), membersController.removeWorkspaceMember);

export default router;
