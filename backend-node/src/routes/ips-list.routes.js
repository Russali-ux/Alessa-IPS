import express from 'express';
import { authenticateToken, requireWorkspace } from '../middlewares/auth.middleware.js';
import * as ipsListController from '../controllers/ips-list.controller.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireWorkspace);

router.get('/', ipsListController.getIpsList);
router.post('/import', ipsListController.importIpsList);

export default router;
