import React, { useState } from 'react';
import { Upload, X, FileVideo, CheckCircle, AlertCircle } from 'lucide-react';
import { videosAPI } from '../services/api';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const socket = io('http://localhost:5000');

const VideoUploadPage = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file) => {
    setError('');
    setUploadSuccess(false);

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a video file (MP4, WebM, OGG, MOV)');
      return;
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      setError('File size exceeds 500MB limit');
      return;
    }

    setUploadedFile(file);
    setVideoTitle(file.name.split('.')[0]); // Default title from filename
  };

  const handleUpload = async () => {
    if (!videoTitle) {
      setError('Please provide a title for the video');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');
    setProcessingStatus('Uploading to server...');

    try {
      // Listen for socket events for this upload session
      socket.on('processing-update', (data) => {
        setProcessingStatus(`Processing: ${data.step} (${data.progress}%)`);
      });

      socket.on('upload-complete', () => {
        setUploadProgress(100);
        setProcessingStatus('Upload complete! Starting analysis...');
      });

      // Actual upload
      await videosAPI.upload(uploadedFile, videoTitle, videoDescription, (progress) => {
        setUploadProgress(progress);
      });

      setUploadSuccess(true);
      setIsUploading(false);
      
      // Navigate to dashboard after short delay or let user choose
      // setTimeout(() => navigate('/dashboard'), 2000);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error.message || 'Upload failed');
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadSuccess(false);
    setError('');
    setVideoTitle('');
    setVideoDescription('');
    setProcessingStatus(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Video</h1>
        <p className="text-gray-600 mt-1">
          Upload your video for sensitivity processing and streaming
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        {!uploadedFile ? (
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
              ${isDragging
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className={`
                p-6 rounded-full transition-colors
                ${isDragging ? 'bg-primary-100' : 'bg-gray-100'}
              `}>
                <Upload className={`h-12 w-12 ${isDragging ? 'text-primary-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 mb-1">
                  Drop your video here, or browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports: MP4, WebM, OGG, MOV (Max 500MB)
                </p>
              </div>
              <label className="cursor-pointer">
                <span className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 
                               rounded-lg inline-block transition-all duration-200 shadow-lg hover:shadow-xl
                               transform hover:-translate-y-0.5">
                  Browse Files
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="video/*"
                  onChange={handleFileInput}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Preview */}
            <div className="flex items-start justify-between p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start space-x-4 flex-1">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <FileVideo className="h-8 w-8 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {uploadedFile.name}
                  </h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                      <span><strong>Size:</strong> {formatFileSize(uploadedFile.size)}</span>
                      <span><strong>Type:</strong> {uploadedFile.type}</span>
                    </div>
                  </div>
                </div>
              </div>
              {!isUploading && !uploadSuccess && (
                <button
                  onClick={resetUpload}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Inputs */}
            {!uploadSuccess && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    disabled={isUploading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="Video Title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={videoDescription}
                    onChange={(e) => setVideoDescription(e.target.value)}
                    disabled={isUploading}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="Video Description"
                  />
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>{processingStatus || 'Uploading...'}</span>
                  {/* <span>{uploadProgress}%</span> */}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-primary-600 h-3 rounded-full transition-all duration-300 animate-pulse" // simple animation for now since simple upload API doesn't return granular progress yet
                    style={{ width: '100%' }} 
                  />
                </div>
              </div>
            )}

            {/* Success Message */}
            {uploadSuccess && (
              <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900">Upload successful!</p>
                  <p className="text-sm text-green-700">
                    Your video is now queued for sensitivity processing
                  </p>
                </div>
              </div>
            )}

            {/* Upload Button */}
            {!isUploading && !uploadSuccess && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleUpload}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 
                           rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl
                           transform hover:-translate-y-0.5"
                >
                  Start Upload
                </button>
                <button
                  onClick={resetUpload}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 
                           hover:bg-gray-50 font-semibold transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            )}

            {uploadSuccess && (
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 
                           rounded-lg transition-all duration-200"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={resetUpload}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 
                           rounded-lg transition-all duration-200"
                >
                  Upload Another Video
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <p className="text-red-900">{error}</p>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Processing Pipeline</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Automatic sensitivity analysis</li>
            <li>• Content classification</li>
            <li>• Real-time progress tracking</li>
            <li>• Instant playback when ready</li>
          </ul>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <h3 className="font-semibold text-purple-900 mb-2">File Requirements</h3>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Max file size: 500MB</li>
            <li>• Formats: MP4, WebM, OGG, MOV</li>
            <li>• Tenant-isolated storage</li>
            <li>• Secure HTTP range streaming</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VideoUploadPage;
