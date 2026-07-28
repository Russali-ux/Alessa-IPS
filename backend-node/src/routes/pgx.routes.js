import express from 'express';
import { getDrugAnnotations } from '../controllers/pgx.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET /api/pgx/annotations?drug=tacrolimus
router.get('/annotations', authenticateToken, getDrugAnnotations);

export default router;
