const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const ffmpeg = require('fluent-ffmpeg');
const Video = require('../models/Video');
const User = require('../models/User');
const { analyzeVideoSensitivity } = require("../services/sensitivity");

const processVideo = async (videoId, io) => {
  const video = await Video.findById(videoId);
  if (!video) return;

    // mark as processing in DB and notify clients
    await Video.findByIdAndUpdate(videoId, { status: 'processing', processingProgress: 0 });
    io?.emit('processing-update', { videoId, progress: 0, status: 'processing' });

    const result = await analyzeVideoSensitivity(video.filepath, videoId, io);

    await Video.findByIdAndUpdate(videoId, {
        status: result.isSafe ? "safe" : "flagged",
        processingProgress: 100,
        flagReason: result.reason || null,
    });

    io?.emit("processing-complete", {
        videoId,
        status: result.isSafe ? "safe" : "flagged",
    });
};

// Upload video
const uploadVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        const { title, description } = req.body;
        const { filename, path: filepath, size } = req.file;

        if (!title) {
            // Clean up uploaded file
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            return res.status(400).json({ error: 'Title is required' });
        }

        const video = await Video.create({
            title,
            description: description || '',
            filename,
            filepath,
            fileSize: size,
            status: 'uploaded',
            uploaderId: req.user.id,
            tenantId: req.user.tenantId
        });

        const io = req.app.get('io');
        if (io) {
            io.emit('upload-complete', { videoId: video._id, status: 'uploaded' });
        }

        // Extract thumbnail and get duration
        extractThumbnailAndDuration(video._id, filepath);
        
        // Start real video processing (frame analysis + audio analysis)
        processVideo(video._id, io);

        res.status(201).json({
            message: 'Video uploaded successfully',
            video: {
                id: video._id,
                title,
                description,
                filename,
                status: 'uploaded'
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Server error during upload' });
    }
};

// Extract thumbnail and probe duration
const extractThumbnailAndDuration = async (videoId, filepath) => {
    try {
        // Ensure thumbnails directory exists
        const thumbnailsDir = path.join(__dirname, '..', 'uploads', 'thumbnails');
        if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

        // Probe for duration
        ffmpeg.ffprobe(filepath, async (err, metadata) => {
            if (!err && metadata && metadata.format && metadata.format.duration) {
                const durationSeconds = Math.floor(metadata.format.duration);
                const hrs = Math.floor(durationSeconds / 3600);
                const mins = Math.floor((durationSeconds % 3600) / 60);
                const secs = durationSeconds % 60;
                const formatted = hrs > 0 
                    ? `${hrs}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}` 
                    : `${mins}:${String(secs).padStart(2,'0')}`;
                await Video.findByIdAndUpdate(videoId, { duration: formatted });
            }
        });

        // Extract thumbnail
        const thumbnailFilename = `${videoId}.jpg`;
        const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);

        ffmpeg(filepath)
            .screenshots({
                timestamps: ['50%'],
                filename: thumbnailFilename,
                folder: thumbnailsDir,
                size: '640x?'
            })
            .on('end', async () => {
                const publicPath = `/uploads/thumbnails/${thumbnailFilename}`;
                await Video.findByIdAndUpdate(videoId, { thumbnail: publicPath });
            })
            .on('error', (err) => {
                console.error('FFmpeg thumbnail error:', err);
            });
    } catch (ffErr) {
        console.error('Thumbnail extraction error:', ffErr);
    }
};
const getVideos = async (req, res) => {
    try {
        const { status, search } = req.query;
        const tenantId = req.user.tenantId;

        const query = { tenantId };

        if (status && status !== 'all') {
            query.status = status;
        }

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const videos = await Video.find(query)
            .populate('uploaderId', 'name')
            .sort({ uploadDate: -1 });

        // Transform to match frontend expectations
        const transformedVideos = videos.map(v => ({
            ...v.toObject(),
            id: v._id,
            uploader_name: v.uploaderId?.name
        }));

        res.json({ videos: transformedVideos });
    } catch (error) {
        console.error('Get videos error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get single video
const getVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const video = await Video.findOne({ _id: id, tenantId: req.user.tenantId })
            .populate('uploaderId', 'name');

        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        res.json({
            video: {
                ...video.toObject(),
                id: video._id,
                uploader_name: video.uploaderId?.name
            }
        });
    } catch (error) {
        console.error('Get video error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Stream video with range requests
const streamVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const video = await Video.findOne({ _id: id, tenantId: req.user.tenantId });

        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        const videoPath = video.filepath; // Local file path for now
        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({ error: 'Video file not found on server' });
        }

        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, { start, end });

            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };

            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    } catch (error) {
        console.error('Stream video error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Increment view count
const incrementViews = async (req, res) => {
    try {
        const { id } = req.params;
        await Video.findOneAndUpdate(
            { _id: id, tenantId: req.user.tenantId },
            { $inc: { views: 1 } }
        );

        res.json({ message: 'View count updated' });
    } catch (error) {
        console.error('Increment views error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete video
const deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const video = await Video.findOne({ _id: id, tenantId: req.user.tenantId });

        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        // Permission: allow admin or the original uploader
        const isAdmin = req.user.role === 'admin';
        const isUploader = video.uploaderId && video.uploaderId.toString() === req.user.id;
        if (!isAdmin && !isUploader) {
            return res.status(403).json({ error: 'Insufficient permissions to delete this video' });
        }

        // Delete file if present
        try {
            if (video.filepath && fs.existsSync(video.filepath)) {
                fs.unlinkSync(video.filepath);
            }
        } catch (fileErr) {
            console.warn('Failed to delete video file:', fileErr);
        }

        // Delete from database
        await Video.deleteOne({ _id: id });

        res.json({ message: 'Video deleted successfully' });
    } catch (error) {
        console.error('Delete video error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    uploadVideo,
    getVideos,
    getVideo,
    streamVideo,
    incrementViews,
    deleteVideo,
    processVideo
};
