const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    filename: {
        type: String,
        required: true
    },
    filepath: { // Keep for local fallback if needed, or GridFS ID
        type: String
    },
    fileId: { // GridFS file ID
        type: mongoose.Schema.Types.ObjectId
    },
    thumbnail: {
        type: String
    },
    status: {
        type: String,
        enum: ['uploaded', 'processing', 'safe', 'flagged'],
        default: 'uploaded'
    },
    fileSize: {
        type: Number
    },
    duration: {
        type: String
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    uploaderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tenantId: {
        type: String,
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    flagReason: {
        type: String
    },
    processingProgress: {
        type: Number,
        default: 0
    },
    analysisResults: {
        frames: [{
            timestamp: Number,
            score: Number,
            flagged: Boolean,
            reason: String
        }],
        audio: {
            transcription: String,
            sensitiveWords: [String],
            score: Number
        },
        overall: {
            score: Number,
            isSafe: Boolean,
            flagReasons: [String]
        }
    }
});

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
