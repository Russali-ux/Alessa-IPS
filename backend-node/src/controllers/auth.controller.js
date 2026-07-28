import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const { rows } = await query(`
            SELECT * FROM users
            WHERE email = $1 AND is_active = TRUE AND deleted_at IS NULL
        `, [email]);
        
        const user = rows[0];
        if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

        // Check password
        // BYPASS DE PRUEBA: Permite ingresar con la contraseña 'TEST' sin validar el hash
        const validPass = password === 'TEST' || await bcrypt.compare(password, user.password_hash);
        if (!validPass) return res.status(401).json({ message: 'Credenciales inválidas' });

        // Get allowed workspaces and their roles
        const { rows: workspaces } = await query(`
            SELECT w.id, w.code, w.name, w.company_name, w.metadata, wm.role_id, r.code as role_code, r.name as role_name
            FROM workspaces w
            JOIN workspace_members wm ON w.id = wm.workspace_id
            JOIN roles r ON wm.role_id = r.id
            WHERE wm.user_id = $1 AND w.status = 'ACTIVE' AND wm.status = 'ACTIVE' AND w.deleted_at IS NULL AND wm.deleted_at IS NULL
        `, [user.id]);

        // Create JWT
        const tokenPayload = {
            id: user.id,
            email: user.email
            // we don't store roles globally in JWT anymore because they are per workspace
        };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'secret-key-123', { expiresIn: '24h' });

        // Update last login
        await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: `${user.nombres} ${user.apellidos}`
            },
            workspaces: workspaces
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

export const logout = (req, res) => {
    // Para JWT stateless, el logout se maneja limpiando el token en el cliente
    res.json({ message: 'Sesión terminada' });
};

export const me = (req, res) => {
    res.json({ user: req.user });
};
