import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import ProgressBar from './ProgressBar';
const backendUrl = import.meta.env.VITE_BACKEND_URL;

function VideoPlayer({ videoFile, vttPath }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [cues, setCues] = useState([]);
  const [spriteBasePath, setSpriteBasePath] = useState('');
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);

  useEffect(() => {
    if (!videoFile || !vttPath) return;

    setIsMetadataLoaded(false);
    const basePath = vttPath.substring(0, vttPath.lastIndexOf('/'));
    setSpriteBasePath(basePath);

    const video = videoRef.current;
    // Updated to full backend URL
    video.src = `${backendUrl}/uploads/${videoFile}`;

    const oldTrack = video.querySelector('track');
    if (oldTrack) video.removeChild(oldTrack);

    const track = document.createElement('track');
    track.kind = 'metadata';
    // Updated to full backend URL
    track.src = `${backendUrl}/uploads/${vttPath}`;
    track.default = true;
    track.onload = () => {
      setCues(Array.from(track.track.cues));
    };
    video.appendChild(track);
    video.load();
  }, [videoFile, vttPath]);

  const togglePlay = () => {
    if (!isMetadataLoaded) return;
    const video = videoRef.current;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video.duration) return;
    setCurrentTime(video.currentTime);
    setDuration(video.duration);

    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      setBuffered((bufferedEnd / video.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    setIsMetadataLoaded(true);
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (percent) => {
    if (!isMetadataLoaded || !duration) return;
    videoRef.current.currentTime = percent * duration;
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || !Number.isFinite(seconds)) return "00:00";
    return new Date(seconds * 1000).toISOString().substr(14, 5);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-black rounded-xl overflow-hidden shadow-2xl">
      <div className="relative">
        <video
          ref={videoRef}
          crossOrigin="anonymous" // Required for cross-port track loading
          className="w-full cursor-pointer"
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />

        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          cues={cues}
          spriteBasePath={spriteBasePath}
          onSeek={handleSeek}
        />
      </div>

      <div className="bg-gray-900 px-6 py-4 flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          <span className="font-medium">{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <span className="text-gray-300 font-mono text-sm">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

export default VideoPlayer;