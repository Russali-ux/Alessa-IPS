import axios from 'axios';

/**
 * Helper para subir/descargar archivos al bucket privado 'ips-documents' de
 * Supabase Storage, usando la API REST directamente (axios ya es dependencia
 * del proyecto). Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el .env.
 *
 * La service_role key bypassea RLS, así que el backend tiene acceso total
 * al bucket sin necesitar políticas adicionales.
 */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = 'ips-documents';

function checkConfigured() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no están configuradas en las variables de entorno.');
    }
}

function headers(contentType) {
    const h = {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
    };
    if (contentType) h['Content-Type'] = contentType;
    return h;
}

/**
 * Sube un buffer en memoria a storagePath dentro del bucket. Sobreescribe si ya existe.
 */
export async function uploadBuffer(storagePath, buffer, contentType = 'application/octet-stream') {
    checkConfigured();
    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
    await axios.post(url, buffer, {
        headers: { ...headers(contentType), 'x-upsert': 'true' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
    });
    return storagePath;
}

/**
 * Descarga el contenido binario de storagePath dentro del bucket.
 */
export async function downloadBuffer(storagePath) {
    checkConfigured();
    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
    const resp = await axios.get(url, {
        headers: headers(),
        responseType: 'arraybuffer',
    });
    return Buffer.from(resp.data);
}

export async function deleteObject(storagePath) {
    checkConfigured();
    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
    const resp = await axios.delete(url, { headers: headers() });
    return resp.status === 200 || resp.status === 204;
}
