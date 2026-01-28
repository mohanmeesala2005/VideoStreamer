const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Video = require('../models/Video');
const User = require('../models/User');

// Socket.io instance will be available via req.app.get('io')

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

        // In a real GridFS implementation, we would write stream here
        // For now, staying with file system storage but using MongoDB for metadata
        // Integrating GridFS would require streaming from Multer directly (via multer-gridfs-storage)
        // or piping from disk to GridFS. For simplicity and robustness given the prompt constraints,
        // I'll stick to disk storage but use MongoDB's full capabilities for metadata.

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

        // Start sensitivity processing simulation (or real logic if implemented)
        simulateProcessing(video._id, io);

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

// Simulate video processing with Socket.io updates
const simulateProcessing = async (videoId, io) => {
    try {
        await Video.findByIdAndUpdate(videoId, { status: 'processing', processingProgress: 0 });

        if (io) {
            io.to(`video-${videoId}`).emit('processing-update', {
                videoId,
                progress: 0,
                status: 'processing',
                step: 'initializing'
            });
        }

        let progress = 0;
        const interval = setInterval(async () => {
            progress += Math.floor(Math.random() * 15) + 5;

            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);

                // Randomly flag some videos (20% chance)
                const isFlagged = Math.random() < 0.2;
                const status = isFlagged ? 'flagged' : 'safe';
                const flagReason = isFlagged ? 'Contains potentially sensitive content (Simulated AI Analysis)' : null;

                await Video.findByIdAndUpdate(videoId, {
                    status,
                    processingProgress: 100,
                    flagReason,
                    'analysisResults.overall.isSafe': !isFlagged,
                    'analysisResults.overall.score': isFlagged ? 0.85 : 0.1
                });

                if (io) {
                    io.to(`video-${videoId}`).emit('processing-update', {
                        videoId,
                        progress: 100,
                        status,
                        step: 'complete'
                    });
                    io.emit('processing-complete', { videoId, status });
                }

                console.log(`✅ Video ${videoId} processing complete: ${status}`);
            } else {
                await Video.findByIdAndUpdate(videoId, { processingProgress: progress });

                // Detailed step simulation
                let step = 'analyzing';
                if (progress < 30) step = 'extracting-frames';
                else if (progress < 60) step = 'analyzing-content';
                else if (progress < 90) step = 'audio-transcription';
                else step = 'finalizing';

                if (io) {
                    io.to(`video-${videoId}`).emit('processing-update', {
                        videoId,
                        progress,
                        status: 'processing',
                        step
                    });
                }
            }
        }, 1500);
    } catch (error) {
        console.error('Processing error:', error);
    }
};

// Get all videos
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

        // Delete file
        if (fs.existsSync(video.filepath)) {
            fs.unlinkSync(video.filepath);
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
    deleteVideo
};
