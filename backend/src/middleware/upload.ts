import fs from 'fs';
import path from 'path';

import multer from 'multer';
import type { Request } from 'express';

import { config } from '../config/env';
import { ApiError } from '../lib/ApiError';

// ─── Ensure upload directories exist ─────────────────────
const uploadDir = path.join(process.cwd(), config.UPLOAD_DIR);

const ensureDir = (dir: string): void => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(uploadDir);
ensureDir(path.join(uploadDir, 'farmers'));
ensureDir(path.join(uploadDir, 'documents'));
ensureDir(path.join(uploadDir, 'temp'));

// ─── Storage: farmer photos ───────────────────────────────
const farmerPhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(uploadDir, 'farmers'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `farmer-${uniqueSuffix}${ext}`);
  },
});

// ─── Storage: documents ───────────────────────────────────
const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(uploadDir, 'documents'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

// ─── File filter: images only ─────────────────────────────
const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void => {
  const allowedTypes = config.ALLOWED_IMAGE_TYPES;

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type: ${file.mimetype}. ` +
          `Allowed types: ${allowedTypes.join(', ')}.`,
      ),
    );
  }
};

// ─── File size limit in bytes ─────────────────────────────
const maxFileSize = config.MAX_FILE_SIZE_MB * 1024 * 1024;

// ─── Upload: single farmer photo (disk) ──────────────────
export const uploadFarmerPhoto = multer({
  storage: farmerPhotoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: maxFileSize,
    files: 1,
  },
}).single('photo');

// ─── Upload: multiple farmer photos (disk) ────────────────
export const uploadFarmerPhotos = multer({
  storage: farmerPhotoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: maxFileSize,
    files: 5,
  },
}).array('photos', 5);

// ─── Upload: document (disk) ──────────────────────────────
export const uploadDocument = multer({
  storage: documentStorage,
  limits: {
    fileSize: maxFileSize,
    files: 1,
  },
}).single('document');

// ─── Upload: to memory (for Sharp processing) ────────────
export const uploadToMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: maxFileSize,
    files: 1,
  },
}).single('photo');

// ─── Helper: get public URL for uploaded file ─────────────
export const getFileUrl = (
  filePath: string,
  type: 'farmers' | 'documents' = 'farmers',
): string => {
  const filename = path.basename(filePath);
  return `${config.BACKEND_URL}/uploads/${type}/${filename}`;
};

// ─── Helper: delete uploaded file from disk ───────────────
export const deleteUploadedFile = (filePath: string): void => {
  try {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    // Log but do not throw — file deletion failure should not crash the app
    console.warn(`Failed to delete file: ${filePath}`, err);
  }
};

// ─── Helper: get relative path from absolute ─────────────
export const getRelativePath = (absolutePath: string): string => {
  return path.relative(process.cwd(), absolutePath);
};

export default uploadFarmerPhoto;
