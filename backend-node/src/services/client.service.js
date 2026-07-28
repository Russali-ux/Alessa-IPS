import * as clientRepository from '../repositories/client.repository.js';
import * as auditRepository from '../repositories/audit.repository.js';

export const getAllClients = async (orgId = null) => {
    return await clientRepository.findAllClients(orgId);
};

export const getClientById = async (id, orgId = null) => {
    return await clientRepository.findClientById(id, orgId);
};

export const createClient = async (clientData, authUserId = null) => {
    const newClient = await clientRepository.createClient(clientData);

    await auditRepository.createAuditLog(
        authUserId,
        'CREATE',
        'CLIENT',
        newClient.id,
        null,
        newClient
    );

    return newClient;
};

export const updateClient = async (id, updateData, authUserId = null) => {
    const oldClient = await clientRepository.findClientById(id);
    if (!oldClient) {
        throw new Error('Client not found');
    }

    const updatedClient = await clientRepository.updateClient(id, updateData);

    await auditRepository.createAuditLog(
        authUserId,
        'UPDATE',
        'CLIENT',
        id,
        oldClient,
        updatedClient
    );

    return updatedClient;
};

export const deleteClient = async (id, authUserId = null) => {
    const oldClient = await clientRepository.findClientById(id);
    if (!oldClient) {
        throw new Error('Client not found');
    }

    const result = await clientRepository.deleteClient(id);

    await auditRepository.createAuditLog(
        authUserId,
        'DELETE',
        'CLIENT',
        id,
        oldClient,
        { deleted_at: 'NOW()', activo: false }
    );

    return result;
};

export const assignUserToClient = async (userId, clientId, roleInClient, authUserId = null) => {
    const assignment = await clientRepository.assignUserToClient(userId, clientId, roleInClient);

    await auditRepository.createAuditLog(
        authUserId,
        'ASSIGN_USER_TO_CLIENT',
        'USER_CLIENT',
        assignment.id,
        null,
        assignment
    );

    return assignment;
};

export const getClientsByUserId = async (userId) => {
    return await clientRepository.findClientsByUserId(userId);
};

export const getUsersByClientId = async (clientId) => {
    return await clientRepository.findUsersByClientId(clientId);
};
