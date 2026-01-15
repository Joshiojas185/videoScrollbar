import { useState, useRef } from 'react';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
function ProgressBar({ currentTime, duration, buffered, cues, spriteBasePath, onSeek }) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewStyle, setPreviewStyle] = useState({});
  const progressRef = useRef(null);

  const handleHover = (e) => {
    if (!cues.length || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = percent * duration;

    const cue = cues.find(c => seekTime >= c.startTime && seekTime < c.endTime);
    if (cue) {
      const [file, coords] = cue.text.split('#xywh=');
      const [x, y, w, h] = coords.split(',').map(Number);

      const visualWidth = 200;
      const scale = visualWidth / w;

      setPreviewStyle({
        display: 'block',
        backgroundImage: `url('${backendUrl}/uploads/${spriteBasePath}/${file}')`,
        backgroundPosition: `-${x * scale}px -${y * scale}px`,
        backgroundSize: '500% auto',
        left: `${e.clientX - rect.left - (visualWidth / 2)}px`,
      });
      setShowPreview(true);
    }
  };

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(percent);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={progressRef}
      className="relative w-full h-1 bg-gray-700 cursor-pointer hover:h-2 transition-all group"
      onMouseMove={handleHover}
      onMouseLeave={() => setShowPreview(false)}
      onClick={handleClick}
    >
      <div
        className="absolute h-full bg-gray-500"
        style={{ width: `${buffered}%` }}
      />
      <div
        className="absolute h-full bg-blue-600 z-10"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {showPreview && (
        <div
          className="absolute bottom-8 w-[200px] h-[112px] border-2 border-white rounded-lg shadow-2xl pointer-events-none z-50 bg-no-repeat"
          style={previewStyle}
        />
      )}
    </div>
  );
}

export default ProgressBar;
