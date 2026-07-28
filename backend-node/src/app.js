import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRoutes from './routes/users.routes.js';
import rolesRoutes from './routes/roles.routes.js';
import authRoutes from './routes/auth.routes.js';
import workspacesRoutes from './routes/workspaces.routes.js';
import workspaceMembersRoutes from './routes/workspace_members.routes.js';
import ipsListRoutes from './routes/ips-list.routes.js';
import ipsCasesRoutes from './routes/ips-cases.routes.js';
import zoteroRoutes from './routes/zotero.routes.js';
import pgxRoutes from './routes/pgx.routes.js';
import productsRoutes from './routes/products.routes.js';
import { authenticateToken } from './middlewares/auth.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, usersRoutes);
app.use('/api/roles', authenticateToken, rolesRoutes);
app.use('/api/workspaces', workspacesRoutes);
app.use('/api/workspace_members', workspaceMembersRoutes);
app.use('/api/ips-list', ipsListRoutes);
app.use('/api/ips-cases', authenticateToken, ipsCasesRoutes);
app.use('/api/integrations/zotero', zoteroRoutes);
app.use('/api/integrations/pgx', pgxRoutes);
app.use('/api/products', productsRoutes);

// Basic error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
