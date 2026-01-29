require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const userRoutes = require('./routes/users');

const path = require('path');
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
    cors: {
        origin: '*', // Allow all origins for dev simplicity, restrict in prod
        methods: ['GET', 'POST']
    }
});

// Store io instance in app to usage in controllers
app.set('io', io);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (thumbnails, stored videos if needed) as static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Track running analyses to prevent duplicates
const runningAnalyses = new Set();

/**
 * Simulated sensitivity analysis process that emits progress events to the
 * socket.io room for the provided videoId. Replace simulation with real steps.
 */
async function startSensitivityAnalysis(videoId, ioInstance, socketInstance = null) {
    const room = `video-${videoId}`;

    if (runningAnalyses.has(videoId)) {
        const msg = `Analysis already running for video ${videoId}`;
        if (socketInstance) socketInstance.emit('analysis-already-running', { videoId, message: msg });
        ioInstance.to(room).emit('analysis-already-running', { videoId, message: msg });
        return;
    }

    runningAnalyses.add(videoId);
    ioInstance.to(room).emit('analysis-started', { videoId, message: 'Sensitivity analysis started' });

    const steps = [
        { name: 'validation', durationMs: 800 },
        { name: 'preprocessing', durationMs: 1200 },
        { name: 'feature-extraction', durationMs: 1500 },
        { name: 'sensitivity-computation', durationMs: 2000 },
        { name: 'postprocessing', durationMs: 800 }
    ];

    try {
        let total = steps.length;
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            // simulate step duration
            await new Promise((resolve) => setTimeout(resolve, step.durationMs));
            const progress = Math.round(((i + 1) / total) * 100);
            ioInstance.to(room).emit('analysis-progress', {
                videoId,
                step: step.name,
                progress,
                message: `Completed ${step.name}`
            });
        }

        // Example result payload - replace with real result
        const result = {
            videoId,
            sensitivityScore: Math.random().toFixed(3),
            completedAt: new Date().toISOString()
        };

        ioInstance.to(room).emit('analysis-complete', { videoId, result });
    } catch (err) {
        console.error('Error during sensitivity analysis for', videoId, err);
        ioInstance.to(room).emit('analysis-error', { videoId, error: err.message || 'Unknown error' });
    } finally {
        runningAnalyses.delete(videoId);
    }
}

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on('join-video-room', (videoId) => {
        socket.join(`video-${videoId}`);
        console.log(`Socket ${socket.id} joined room video-${videoId}`);
    });

    // Client can request to start analysis for a uploaded video after redirect to dashboard
    socket.on('start-analysis', (videoId) => {
        console.log(`Received start-analysis for video ${videoId} from socket ${socket.id}`);
        startSensitivityAnalysis(videoId, io, socket);
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);

// HTTP endpoint to start analysis (controllers can call this or client can hit it)
app.post('/api/videos/:id/analysis/start', (req, res) => {
    const videoId = req.params.id;
    if (!videoId) return res.status(400).json({ error: 'Missing video id' });

    // Trigger analysis asynchronously and return immediately
    startSensitivityAnalysis(videoId, io);

    return res.json({ status: 'started', videoId, message: 'Sensitivity analysis started' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Video Streaming Platform API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// Start server (using server.listen for socket.io, not app.listen)
server.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
    console.log(`Socket.io initialized`);
});
