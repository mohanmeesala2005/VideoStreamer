const express = require('express');
const multer = require('multer');
const path = require('path');
const {
    uploadVideo,
    getVideos,
    getVideo,
    streamVideo,
    incrementViews,
    deleteVideo
} = require('../controllers/videoController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', 'videos'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only MP4, WebM, OGG, and MOV files are allowed.'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
    }
});

// Routes
router.get('/', authMiddleware, getVideos);
router.get('/:id', authMiddleware, getVideo);
router.post('/upload', authMiddleware, requireRole('editor', 'admin'), upload.single('video'), uploadVideo);
router.get('/:id/stream', authMiddleware, streamVideo);
router.patch('/:id/view', authMiddleware, incrementViews);
router.delete('/:id', authMiddleware, requireRole('admin'), deleteVideo);

module.exports = router;
