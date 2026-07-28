import multer from 'multer';

// Almacenamiento en memoria: los archivos llegan como buffers (req.files.X[0].buffer)
// en lugar de guardarse en disco. Esto es necesario para poder subirlos a
// Supabase Storage y para que funcione en entornos serverless (Vercel) donde
// el disco no persiste entre invocaciones.
const storage = multer.memoryStorage();

export const upload = multer({ storage: storage });
