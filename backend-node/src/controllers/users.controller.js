import * as userService from '../services/user.service.js';

import { query } from '../config/database.js';

export const getAllUsers = async (req, res) => {
    try {
        let isSuperAdmin = req.user && req.user.email === 'contact@alessadatabase.cloud';
        
        if (!isSuperAdmin && req.user) {
            const { rows } = await query(`
                SELECT 1 FROM workspace_members wm 
                JOIN roles r ON wm.role_id = r.id 
                WHERE wm.user_id = $1 AND r.code = 'SUPER_ADMIN' 
                AND wm.status = 'ACTIVE' AND wm.deleted_at IS NULL
            `, [req.user.id]);
            if (rows.length > 0) isSuperAdmin = true;
        }

        let users;
        if (isSuperAdmin) {
            users = await userService.getAllUsers();
        } else {
            users = await userService.getUsersInAdminWorkspaces(req.user.id);
        }
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserById = async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createUser = async (req, res) => {
    try {
        const authUserId = req.user ? req.user.id : null; 
        const userData = { ...req.body };
        const newUser = await userService.createUser(userData, authUserId);
        res.status(201).json(newUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        const authUserId = req.user ? req.user.id : null;
        const existingUser = await userService.getUserById(req.params.id);
        if (!existingUser) return res.status(404).json({ message: 'User not found' });

        const updatedUser = await userService.updateUser(req.params.id, req.body, authUserId);
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updateStatus = async (req, res) => {
    try {
        const authUserId = req.user ? req.user.id : null;
        
        const existingUser = await userService.getUserById(req.params.id);
        if (!existingUser) return res.status(404).json({ message: 'User not found' });

        const { is_active } = req.body;
        const updatedUser = await userService.updateUser(req.params.id, { is_active }, authUserId);
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const authUserId = req.user ? req.user.id : null;
        
        const existingUser = await userService.getUserById(req.params.id);
        if (!existingUser) return res.status(404).json({ message: 'User not found' });

        await userService.deleteUser(req.params.id, authUserId);
        res.status(200).json({ message: 'User soft deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getAllRoles = async (req, res) => {
    try {
        const roles = await userService.getAllRoles();
        const isSuperAdmin = req.user && req.user.role && req.user.role.role_code === 'SUPER_ADMIN';
        const filteredRoles = isSuperAdmin ? roles : roles.filter(r => r.code !== 'SUPER_ADMIN');
        res.status(200).json(filteredRoles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getWorkspacesByUser = async (req, res) => {
    try {
        const workspaces = await userService.getWorkspacesByUser(req.params.id);
        res.status(200).json(workspaces);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

