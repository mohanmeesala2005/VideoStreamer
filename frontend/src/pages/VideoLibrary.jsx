import React, { useState, useEffect } from "react";
import {
  Grid3x3,
  List,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  Video,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { useRole } from "../contexts/RoleContext";
import { Link } from "react-router-dom";
import { videosAPI } from "../services/api";

const StatusBadge = ({ status }) => {
  const variants = {
    safe: "bg-green-100 text-green-700 border-green-200",
    flagged: "bg-red-100 text-red-700 border-red-200",
    processing: "bg-blue-100 text-blue-700 border-blue-200",
    uploaded: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const icons = {
    safe: <CheckCircle className="h-4 w-4" />,
    flagged: <AlertTriangle className="h-4 w-4" />,
    processing: <Clock className="h-4 w-4 animate-spin" />,
    uploaded: <Video className="h-4 w-4" />,
  };

  return (
    <span
      className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${variants[status] || variants.uploaded}`}
    >
      {icons[status] || icons.uploaded}
      <span className="capitalize">{status}</span>
    </span>
  );
};

const VideoLibrary = () => {
  const { user } = useRole();
  const [videos, setVideos] = useState([]);
  const [view, setView] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const filters = {};
        if (filterStatus !== "all") filters.status = filterStatus;
        if (searchQuery) filters.search = searchQuery;

        const data = await videosAPI.getAll(filters);
        let sortedVideos = data.videos;

        // Frontend sorting for now, ideally API handles this
        if (sortBy === "recent") {
          sortedVideos.sort(
            (a, b) => new Date(b.uploadDate) - new Date(a.uploadDate),
          );
        } else if (sortBy === "views") {
          sortedVideos.sort((a, b) => b.views - a.views);
        }

        setVideos(sortedVideos);
      } catch (error) {
        console.error("Failed to fetch videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [filterStatus, searchQuery, sortBy]);

  const VideoCard = ({ video }) => {
    const fileSize = video.fileSize
      ? Math.round(video.fileSize / 1024 / 1024) + " MB"
      : "0 MB";
    const uploadDate = new Date(video.uploadDate).toLocaleDateString();
    const [deleting, setDeleting] = useState(false);

    if (view === "list") {
      return (
        <Link
          to={`/video/${video.id}`}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200 block relative"
        >
          <div className="flex items-center space-x-4">
            <div className="w-40 h-24 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
              {video.thumbnail ? (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Video className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                {video.title}
              </h3>
              <div className="flex items-center space-x-3 text-sm text-gray-500">
                <span>{video.duration || "0:00"}</span>
                <span>•</span>
                <span>{fileSize}</span>
                <span>•</span>
                <span>{video.views.toLocaleString()} views</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{uploadDate}</p>
            </div>
            <div className="flex items-center space-x-2">
              <StatusBadge status={video.status} />
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (
                    !confirm("Delete this video? This action cannot be undone.")
                  )
                    return;
                  try {
                    setDeleting(true);
                    await videosAPI.delete(video.id);
                    // remove from list
                    setVideos((v) => v.filter((vv) => vv.id !== video.id));
                  } catch (err) {
                    console.error("Delete failed", err);
                    alert("Failed to delete video");
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="ml-2 inline-flex items-center px-3 py-1 rounded text-sm bg-red-50 text-red-700 border border-red-100 hover:bg-red-100"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </Link>
      );
    }

    return (
      <Link
        to={`/video/${video.id}`}
        className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-300 group block"
      >
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
          <div className="absolute top-2 right-2 flex items-center space-x-2">
            <StatusBadge status={video.status} />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (
                  !confirm("Delete this video? This action cannot be undone.")
                )
                  return;
                (async () => {
                  try {
                    await videosAPI.delete(video.id);
                    setVideos((v) => v.filter((vv) => vv.id !== video.id));
                  } catch (err) {
                    console.error("Delete failed", err);
                    alert("Failed to delete video");
                  }
                })();
              }}
              className="inline-flex items-center px-3 py-1 rounded text-sm bg-red-50 text-red-700 border border-red-100 hover:bg-red-100"
            >
              Delete
            </button>
          </div>
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
            {video.duration || "0:00"}
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-base font-semibold text-gray-900 truncate mb-2">
            {video.title}
          </h3>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{video.views.toLocaleString()} views</span>
            <span>{uploadDate}</span>
          </div>
        </div>
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading videos...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Video Library</h1>
          <p className="text-gray-600 mt-1">
            {videos.length} video{videos.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setView("grid")}
            className={`p-2 rounded-lg transition-colors ${
              view === "grid"
                ? "bg-primary-100 text-primary-600"
                : "text-gray-400 hover:bg-gray-100"
            }`}
          >
            <Grid3x3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-2 rounded-lg transition-colors ${
              view === "list"
                ? "bg-primary-100 text-primary-600"
                : "text-gray-400 hover:bg-gray-100"
            }`}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       transition-all duration-200"
            />
          </div>

          {/* Filter by Status */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg
                       hover:bg-gray-50 transition-all duration-200"
            >
              <Filter className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-700">Filters</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none 
                       focus:ring-2 focus:ring-primary-500 transition-all duration-200"
            >
              <option value="recent">Most Recent</option>
              <option value="views">Most Viewed</option>
            </select>
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {["all", "safe", "processing", "flagged"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterStatus === status
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Videos Grid/List */}
      {videos.length > 0 ? (
        <div
          className={`${
            view === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
          }`}
        >
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No videos found
          </h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Tenant Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Tenant Isolated:</strong> You're viewing videos from tenant "
          {user?.tenantId}"
        </p>
      </div>
    </div>
  );
};

export default VideoLibrary;
