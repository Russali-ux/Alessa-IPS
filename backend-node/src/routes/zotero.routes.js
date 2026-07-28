import express from 'express';
import * as zoteroController from '../controllers/zotero.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/login', authenticateToken, zoteroController.login);
router.get('/callback', authenticateToken, zoteroController.callback);
router.get('/status', authenticateToken, zoteroController.status);
router.post('/disconnect', authenticateToken, zoteroController.disconnect);
router.get('/collections', authenticateToken, zoteroController.getCollections);
router.get('/collections/:collectionKey/items', authenticateToken, zoteroController.getCollectionItems);
router.post('/import', authenticateToken, zoteroController.importItems);

export default router;
