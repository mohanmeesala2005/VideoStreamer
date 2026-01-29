const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const sharp = require("sharp");
const Video = require('../models/Video');

// simple thresholds
const RED_THRESHOLD = 180;
const RED_RATIO_LIMIT = 0.25;

/**
 * Step 1: Extract a few frames
 * Step 2: Check if any frame is red-dominant
 * Step 3: Return SAFE or FLAGGED
 */
const analyzeVideoSensitivity = async (videoPath, videoId, io) => {
  const framesDir = path.join(__dirname, "../uploads/frames", videoId.toString());
  fs.mkdirSync(framesDir, { recursive: true });

  // extract 5 frames
  // emit initial progress
  io?.emit('processing-update', { videoId, progress: 10, status: 'processing' });
  await Video.findByIdAndUpdate(videoId, { processingProgress: 10, status: 'processing' });

  await new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        count: 5,
        folder: framesDir,
        filename: "frame-%i.jpg",
        size: "640x480",
      })
      .on("end", resolve)
      .on("error", reject);
  });

  io?.emit('processing-update', { videoId, progress: 30, status: 'processing' });
  await Video.findByIdAndUpdate(videoId, { processingProgress: 30, status: 'processing' });

  const frames = fs.readdirSync(framesDir);

  const perFrameIncrement = Math.floor(50 / Math.max(1, frames.length));
  let progress = 30;

  for (const frame of frames) {
    const buffer = await sharp(path.join(framesDir, frame))
      .raw()
      .toBuffer();

    let redPixels = 0;
    const totalPixels = buffer.length / 3;

    for (let i = 0; i < buffer.length; i += 3) {
      if (buffer[i] > RED_THRESHOLD) redPixels++;
    }

    progress += perFrameIncrement;
    if (progress > 90) progress = 90;
    io?.emit('processing-update', { videoId, progress, status: 'processing' });
    await Video.findByIdAndUpdate(videoId, { processingProgress: progress });

    if (redPixels / totalPixels > RED_RATIO_LIMIT) {
      cleanup(framesDir);
      // emit near-complete then complete
      io?.emit('processing-update', { videoId, progress: 95, status: 'processing' });
      await Video.findByIdAndUpdate(videoId, { processingProgress: 95 });
      return { isSafe: false, reason: "Red-dominant frames detected" };
    }
  }

  cleanup(framesDir);
  // final analysis stage before marking complete
  io?.emit('processing-update', { videoId, progress: 98, status: 'processing' });
  await Video.findByIdAndUpdate(videoId, { processingProgress: 98 });
  return { isSafe: true };
};

const cleanup = (dir) => {
  fs.rmSync(dir, { recursive: true, force: true });
};

module.exports = { analyzeVideoSensitivity };
