import bcrypt from 'bcrypt';
import * as userRepository from '../repositories/user.repository.js';
import * as auditRepository from '../repositories/audit.repository.js';

export const getAllUsers = async (orgId = null) => {
    return await userRepository.findAllUsers(orgId);
};

export const getUsersInAdminWorkspaces = async (adminUserId) => {
    return await userRepository.findUsersInAdminWorkspaces(adminUserId);
};

export const getUserById = async (id, orgId = null) => {
    return await userRepository.findUserById(id, orgId);
};

export const createUser = async (userData, authUserId = null) => {
    const existing = await userRepository.findUserByEmail(userData.email);
    if (existing) {
        // Instead of throwing an error, we return the existing user
        // so that the caller can link them to a workspace.
        return { ...existing, isExisting: true };
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    const newUser = await userRepository.createUser({
        ...userData,
        passwordHash,
    });

    if (userData.roles && Array.isArray(userData.roles)) {
        for (const roleId of userData.roles) {
            await userRepository.assignRoleToUser(newUser.id, roleId);
        }
    }

    await auditRepository.createAuditLog(
        authUserId, 
        'CREATE', 
        'USER', 
        newUser.id, 
        null, 
        newUser
    );

    return newUser;
};

export const updateUser = async (id, updateData, authUserId = null) => {
    const oldUser = await userRepository.findUserById(id);
    if (!oldUser) {
        throw new Error('User not found');
    }

    if (updateData.password) {
        updateData.password_hash = await bcrypt.hash(updateData.password, 10);
    }
    delete updateData.password;

    const newRoles = updateData.roles;
    delete updateData.roles;

    const updatedUser = await userRepository.updateUser(id, updateData);

    if (newRoles && Array.isArray(newRoles)) {
        await userRepository.deleteRolesByUserId(id);
        for (const roleId of newRoles) {
            await userRepository.assignRoleToUser(id, roleId);
        }
    }

    await auditRepository.createAuditLog(
        authUserId, 
        'UPDATE', 
        'USER', 
        id, 
        oldUser, 
        updatedUser
    );

    return updatedUser;
};

export const deleteUser = async (id, authUserId = null) => {
    const oldUser = await userRepository.findUserById(id);
    if (!oldUser) {
        throw new Error('User not found');
    }

    const result = await userRepository.deleteUser(id);

    await auditRepository.createAuditLog(
        authUserId, 
        'DELETE', 
        'USER', 
        id, 
        oldUser, 
        { deleted_at: 'NOW()', is_active: false }
    );

    return result;
};

export const getAllRoles = async () => {
    return await userRepository.getAllRoles();
};

export const getWorkspacesByUser = async (userId) => {
    return await userRepository.getWorkspacesByUser(userId);
};
