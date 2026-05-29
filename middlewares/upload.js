import multer from 'multer';
import path from 'path';
import fs from 'fs';
import config from '../config.js';

const uploadDir = config.UPLOAD_DIR;
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * @descripción Configuración de almacenamiento de multer: define el directorio de destino para los archivos subidos.
 */
const storage = multer.diskStorage({
    /**
     * @descripción Determina el directorio donde se guardarán los archivos subidos.
     * @param {import('express').Request} req - Objeto de solicitud Express
     * @param {object} file - Archivo subido
     * @param {function} cb - Callback de multer: cb(null, directorio)
     */
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    /**
     * @descripción Genera un nombre de archivo único con timestamp y número aleatorio.
     * @param {import('express').Request} req - Objeto de solicitud Express
     * @param {object} file - Archivo subido
     * @param {function} cb - Callback de multer: cb(null, nombreArchivo)
     */
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});

/**
 * @descripción Filtro de archivos que permite solo imágenes JPEG, PNG, WebP y GIF.
 * @param {import('express').Request} req - Objeto de solicitud Express
 * @param {object} file - Archivo subido
 * @param {function} cb - Callback de multer: cb(error, aceptado)
 * @throws {Error} - Error si el tipo de archivo no está permitido
 */
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'), false);
    }
};

/**
 * @descripción Middleware de multer configurado con almacenamiento en disco, límite de 5 MB y filtro de imágenes.
 */
export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter,
});

export default upload;
