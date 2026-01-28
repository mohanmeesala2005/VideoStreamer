const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const sharp = require("sharp");

// simple thresholds
const RED_THRESHOLD = 180;
const RED_RATIO_LIMIT = 0.25;

/**
 * Step 1: Extract a few frames
 * Step 2: Check if any frame is red-dominant
 * Step 3: Return SAFE or FLAGGED
 */
const analyzeVideoSensitivity = async (videoPath, videoId) => {
  const framesDir = path.join(__dirname, "../uploads/frames", videoId.toString());
  fs.mkdirSync(framesDir, { recursive: true });

  // extract 5 frames
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

  const frames = fs.readdirSync(framesDir);

  for (const frame of frames) {
    const buffer = await sharp(path.join(framesDir, frame))
      .raw()
      .toBuffer();

    let redPixels = 0;
    const totalPixels = buffer.length / 3;

    for (let i = 0; i < buffer.length; i += 3) {
      if (buffer[i] > RED_THRESHOLD) redPixels++;
    }

    if (redPixels / totalPixels > RED_RATIO_LIMIT) {
      cleanup(framesDir);
      return { isSafe: false, reason: "Red-dominant frames detected" };
    }
  }

  cleanup(framesDir);
  return { isSafe: true };
};

const cleanup = (dir) => {
  fs.rmSync(dir, { recursive: true, force: true });
};

module.exports = { analyzeVideoSensitivity };
