import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye
} from 'lucide-react';
import { videosAPI } from '../services/api';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const VideoPlayer = () => {
  const { id } = useParams();
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);

  // Fetch video data
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const data = await videosAPI.getById(id);
        setVideoData(data.video);
      } catch (error) {
        console.error('Failed to fetch video:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
    
    // Increment view count
    videosAPI.incrementViews(id).catch(err => console.error('Failed to increment views', err));

    // Listen for updates on this video
    socket.on('processing-update', (data) => {
      if (data.videoId === id) {
        setVideoData(prev => ({ ...prev, status: data.status, processingProgress: data.progress }));
      }
    });

    socket.on('processing-complete', (data) => {
       if (data.videoId === id) {
          // Re-fetch to get full details like flag reasons
          fetchVideo();
       }
    });

    return () => {
      socket.off('processing-update');
      socket.off('processing-complete');
    };
  }, [id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoData]); // Re-run when videoData (and thus video element source) might change

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e) => {
    const seekTime = (e.target.value / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value / 100;
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const skip = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading video...</div>;
  }

  if (!videoData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Video not found</h2>
        <Link to="/library" className="text-primary-600 mt-4 inline-block hover:underline">Return to Library</Link>
      </div>
    );
  }

  const canPlay = videoData.status === 'safe' || videoData.status === 'flagged' || videoData.status === 'uploaded';
  const fileSize = videoData.fileSize ? Math.round(videoData.fileSize/1024/1024) + ' MB' : 'Unknown';
  const uploadDate = new Date(videoData.uploadDate).toLocaleDateString();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        to="/library"
        className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Library</span>
      </Link>

      {/* Video Player */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div
          className="relative bg-black aspect-video"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(isPlaying ? false : true)}
        >
          {canPlay ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full"
                onClick={togglePlay}
                poster={videoData.thumbnail}
              >
                <source src={videosAPI.getStreamUrl(videoData.id)} type="video/mp4" />
                Your browser does not support the video tag.
              </video>

              {/* Video Controls */}
              <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                {/* Progress Bar */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={duration > 0 ? (currentTime / duration) * 100 : 0}
                  onChange={handleSeek}
                  className="w-full mb-3 cursor-pointer"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Play/Pause */}
                    <button
                      onClick={togglePlay}
                      className="text-white hover:text-primary-400 transition-colors"
                    >
                      {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </button>

                    {/* Skip Buttons */}
                    <button
                      onClick={() => skip(-10)}
                      className="text-white hover:text-primary-400 transition-colors"
                    >
                      <SkipBack className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => skip(10)}
                      className="text-white hover:text-primary-400 transition-colors"
                    >
                      <SkipForward className="h-5 w-5" />
                    </button>

                    {/* Volume */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={toggleMute}
                        className="text-white hover:text-primary-400 transition-colors"
                      >
                        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume * 100}
                        onChange={handleVolumeChange}
                        className="w-20 cursor-pointer"
                      />
                    </div>

                    {/* Time */}
                    <span className="text-white text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="text-white hover:text-primary-400 transition-colors"
                  >
                    <Maximize className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                {videoData.status === 'processing' ? (
                  <>
                    <Clock className="h-16 w-16 text-blue-400 mx-auto animate-spin" />
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">Processing...</h3>
                      <p className="text-gray-300">This video is currently being processed for sensitivity analysis</p>
                      {videoData.processingProgress !== undefined && (
                         <div className="w-64 h-2 bg-gray-700 rounded-full mx-auto mt-4 overflow-hidden">
                           <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${videoData.processingProgress}%` }}></div>
                         </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Play className="h-16 w-16 text-gray-400 mx-auto" />
                    <p className="text-gray-300">Video player not available</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="p-6 space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {videoData.status === 'safe' && (
                <div className="flex items-center space-x-2 text-green-700 bg-green-100 px-4 py-2 rounded-lg border border-green-200">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Safe to Watch</span>
                </div>
              )}
              {videoData.status === 'flagged' && (
                <div className="flex items-center space-x-2 text-red-700 bg-red-100 px-4 py-2 rounded-lg border border-red-200">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">Flagged Content</span>
                </div>
              )}
              {videoData.status === 'processing' && (
                <div className="flex items-center space-x-2 text-blue-700 bg-blue-100 px-4 py-2 rounded-lg border border-blue-200">
                  <Clock className="h-5 w-5" />
                  <span className="font-semibold">Processing</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 text-gray-500">
              <Eye className="h-5 w-5" />
              <span>{videoData.views.toLocaleString()} views</span>
            </div>
          </div>

          {/* Flag Reason */}
          {videoData.status === 'flagged' && videoData.flagReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Flag Reason:</strong> {videoData.flagReason}
              </p>
            </div>
          )}

          {/* Title & Description */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{videoData.title}</h1>
            <p className="text-gray-600 whitespace-pre-line">{videoData.description}</p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-500 mb-1">Uploaded by</p>
              <p className="font-semibold text-gray-900">{videoData.uploader_name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Upload Date</p>
              <p className="font-semibold text-gray-900">{uploadDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Duration</p>
              <p className="font-semibold text-gray-900">{videoData.duration || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">File Size</p>
              <p className="font-semibold text-gray-900">{fileSize}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Range Request Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
        <h3 className="font-semibold text-purple-900 mb-2">
          Secure Streaming with HTTP Range Requests
        </h3>
        <p className="text-sm text-purple-800">
          This video player supports seeking and partial content loading using HTTP range requests, 
          allowing for efficient streaming and bandwidth optimization.
        </p>
      </div>
    </div>
  );
};

export default VideoPlayer;
