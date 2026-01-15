import { useState, useEffect } from 'react';
import { Play, Grid3x3 } from 'lucide-react';
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

function Gallery({ onVideoSelect }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/videos`);
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="text-gray-400 mt-4">Loading videos...</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800 rounded-xl">
        <Grid3x3 className="mx-auto mb-4 text-gray-500" size={64} />
        <p className="text-gray-400 text-lg">No videos yet. Upload your first video to get started!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
        <Grid3x3 size={32} />
        Video Gallery
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => (
          <div
            key={video.id}
            className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
            onClick={() => onVideoSelect(video)}
          >
            <div className="relative aspect-video bg-gray-900">
              <img
                // src={`${backendUrl}/uploads/${video.sprite_path}/sprite_0.png`}
                src = {'https://reactrajasthan.com/assets/rr-cityjsconf.jpg'}
                alt="Video preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://reactrajasthan.com/assets/rr-cityjsconf.jpg';
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all">
                <Play className="text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all" size={48} />
              </div>
            </div>
            <div className="p-4">
              <p className="text-gray-400 text-sm mb-1">Video ID</p>
              <p className="text-white font-semibold truncate">{video.id}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Gallery;
