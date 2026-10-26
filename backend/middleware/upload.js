// middleware/upload.js — Multer file upload configuration
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const csvDir = path.join(uploadDir, 'csv');
if (!fs.existsSync(csvDir)) {
  fs.mkdirSync(csvDir, { recursive: true });
}

const submissionDir = path.join(uploadDir, 'submissions');
if (!fs.existsSync(submissionDir)) {
  fs.mkdirSync(submissionDir, { recursive: true });
}

// Generic disk storage
const diskStorage = (subfolder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(uploadDir, subfolder));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const safeName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      cb(null, safeName);
    },
  });

// Allowed MIME types for submission attachments
const submissionFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'image/png',
    'image/jpeg',
    'image/gif',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

const csvFilter = (req, file, cb) => {
  const allowed = ['text/csv', 'application/vnd.ms-excel', 'application/octet-stream'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(file.mimetype) || ext === '.csv') {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed for import'), false);
  }
};

const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);

exports.uploadSubmission = multer({
  storage: diskStorage('submissions'),
  fileFilter: submissionFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
}).array('attachments', 5);

exports.uploadCsv = multer({
  storage: diskStorage('csv'),
  fileFilter: csvFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max for CSV
}).single('file');
