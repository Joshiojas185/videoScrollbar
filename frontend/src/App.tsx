
import React, { useState, useEffect } from 'react';
import { Video, Home } from 'lucide-react';
import VideoPlayer from './components/VideoPlayer';
import VideoUploader from './components/VideoUploader';
import Gallery from './components/Gallery';
import { getSocket } from './utils/socket';

function App() {
  const [view, setView] = useState('home');
  const [status, setStatus] = useState('ready');
  const [currentVideo, setCurrentVideo] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoParam = params.get('video');
    const vttParam = params.get('vtt');

    if (videoParam && vttParam) {
      setCurrentVideo({
        video_path: videoParam,
        vtt_path: vttParam,
      });
      setView('player');
    }

    const socket = getSocket();

    socket.on('completed', (data) => {
      setStatus('complete');
      setCurrentVideo({
        video_path: data.video,
        vtt_path: data.vtt,
      });
      setView('player');
    });

    return () => {
      socket.off('completed');
    };
  }, []);

  const handleUploadStart = () => {
    setStatus('uploading');
    setTimeout(() => setStatus('processing'), 1000);
  };

  const handleVideoSelect = (video) => {
    setCurrentVideo({
      video_path: video.video_path,
      vtt_path: video.vtt_path,
    });
    setView('player');
  };

  const handleBackToHome = () => {
    setView('home');
    setCurrentVideo(null);
    setStatus('ready');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <nav className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Video className="text-blue-500" size={32} />
              <h1 className="text-2xl font-bold text-white">Video Preview Pro</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBackToHome}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  view === 'home'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Home size={20} />
                <span>Home</span>
              </button>
              <button
                onClick={() => setView('gallery')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  view === 'gallery'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Video size={20} />
                <span>Gallery</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'home' && (
          <div className="space-y-8">
            <VideoUploader onUploadStart={handleUploadStart} status={status} />
            {currentVideo && status === 'complete' && (
              <VideoPlayer
                videoFile={currentVideo.video_path}
                vttPath={currentVideo.vtt_path}
              />
            )}
          </div>
        )}

        {view === 'player' && currentVideo && (
          <div className="space-y-6">
            <VideoPlayer
              videoFile={currentVideo.video_path}
              vttPath={currentVideo.vtt_path}
            />
          </div>
        )}

        {view === 'gallery' && (
          <Gallery onVideoSelect={handleVideoSelect} />
        )}
      </main>
    </div>
  );
}

export default App;
