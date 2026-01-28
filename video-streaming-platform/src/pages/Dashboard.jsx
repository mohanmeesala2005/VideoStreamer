import React, { useState, useEffect } from 'react';
import {
  Video,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Grid3x3,
  List
} from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { videosAPI } from '../services/api';
import io from 'socket.io-client';
import { Link } from 'react-router-dom';

const socket = io('http://localhost:5000');

const StatusBadge = ({ status }) => {
  const variants = {
    safe: 'bg-green-100 text-green-700 border-green-200',
    flagged: 'bg-red-100 text-red-700 border-red-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    uploaded: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  const icons = {
    safe: <CheckCircle className="h-4 w-4" />,
    flagged: <AlertTriangle className="h-4 w-4" />,
    processing: <Clock className="h-4 w-4 animate-spin" />,
    uploaded: <Video className="h-4 w-4" />
  };

  return (
    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${variants[status] || variants.uploaded}`}>
      {icons[status] || icons.uploaded}
      <span className="capitalize">{status}</span>
    </span>
  );
};

const VideoCard = ({ video, view }) => {
  const progress = video.processingProgress || 0;

  if (view === 'list') {
    return (
      <Link to={`/video/${video.id}`} className="block">
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
          <div className="flex items-center space-x-4">
            <div className="w-32 h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
               {video.thumbnail ? (
                 <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
               ) : (
                 <Video className="h-8 w-8 text-gray-400" />
               )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{video.title}</h3>
              <div className="mt-1 flex items-center space-x-3 text-sm text-gray-500">
                <span>{video.duration || '0:00'}</span>
                <span>•</span>
                <span>{video.fileSize ? Math.round(video.fileSize/1024/1024) + ' MB' : '0 MB'}</span>
                <span>•</span>
                <span>{new Date(video.uploadDate).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {video.status === 'processing' && (
                <div className="w-32">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Processing</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
              <StatusBadge status={video.status} />
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/video/${video.id}`} className="block">
      <div className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-300 group h-full flex flex-col">
        <div className="relative h-48 bg-gray-200">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
               <Video className="h-12 w-12 text-gray-400" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <StatusBadge status={video.status} />
          </div>
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {video.duration || '0:00'}
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-base font-semibold text-gray-900 truncate mb-2">{video.title}</h3>
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3 mt-auto">
            <span>{video.fileSize ? Math.round(video.fileSize/1024/1024) + ' MB' : '0 MB'}</span>
            <span>{new Date(video.uploadDate).toLocaleDateString()}</span>
          </div>
          {video.status === 'processing' && (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Processing</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

const Dashboard = () => {
  const { user } = useRole();
  const [videos, setVideos] = useState([]);
  const [view, setView] = useState('grid');
  const [loading, setLoading] = useState(true);

  // Fetch videos on mount
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const data = await videosAPI.getAll();
        setVideos(data.videos);
      } catch (error) {
        console.error('Failed to fetch videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  // Listen for socket updates
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.on('upload-complete', (data) => {
      console.log('Upload complete:', data);
      videosAPI.getAll().then(d => setVideos(d.videos));
    });

    socket.on('processing-update', (data) => {
      setVideos(prev => prev.map(v => 
        v.id === data.videoId ? { ...v, status: data.status, processingProgress: data.progress } : v
      ));
    });

    socket.on('processing-complete', (data) => {
      setVideos(prev => prev.map(v => 
        v.id === data.videoId ? { ...v, status: data.status, processingProgress: 100 } : v
      ));
    });

    return () => {
      socket.off('connect');
      socket.off('upload-complete');
      socket.off('processing-update');
      socket.off('processing-complete');
    };
  }, []);

  const stats = {
    total: videos.length,
    safe: videos.filter(v => v.status === 'safe').length,
    flagged: videos.filter(v => v.status === 'flagged').length,
    processing: videos.filter(v => v.status === 'processing').length
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back, <span className="font-semibold">{user?.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Videos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="bg-primary-100 p-3 rounded-lg">
              <Video className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Safe Videos</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.safe}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            {stats.total > 0 ? Math.round((stats.safe / stats.total) * 100) : 0}% of total
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Processing</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.processing}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">In progress</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Flagged</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.flagged}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">Requires review</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Videos</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-lg transition-colors ${
                view === 'grid'
                  ? 'bg-primary-100 text-primary-600'
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg transition-colors ${
                view === 'list'
                  ? 'bg-primary-100 text-primary-600'
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {videos.length > 0 ? (
          <div className={`${
            view === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }`}>
            {videos.map(video => (
              <VideoCard key={video.id} video={video} view={view} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No videos found. Upload one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
