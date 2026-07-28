import { Router } from 'express';
import * as usersController from '../controllers/users.controller.js';

const router = Router();

router.get('/', usersController.getAllUsers);
router.get('/:id', usersController.getUserById);
router.post('/', usersController.createUser);
router.put('/:id', usersController.updateUser);
router.patch('/:id/status', usersController.updateStatus);
router.delete('/:id', usersController.deleteUser);
router.get('/:id/workspaces', usersController.getWorkspacesByUser);

export default router;
