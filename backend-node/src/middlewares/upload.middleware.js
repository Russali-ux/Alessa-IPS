import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Determinar el directorio de subida (relativo a backend-node)
// Guardar en la carpeta que el backend de Python espera: ../src/config/clienteTemplate
const uploadDir = path.resolve(process.cwd(), '../src/config/clienteTemplate');

// Crear directorio si no existe
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Usar timestamp y nombre original para evitar colisiones
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

export const upload = multer({ storage: storage });
