import { useState, useRef } from 'react';
import { Upload, Loader } from 'lucide-react';

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
function VideoUploader({ onUploadStart, status }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a video file');
      return;
    }

    const formData = new FormData();
    formData.append('video', selectedFile);

    onUploadStart();

    try {
      await fetch(`${backendUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const isProcessing = status === 'uploading' || status === 'processing';

  return (
    <div className="w-full max-w-2xl mx-auto bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-8 border border-gray-700">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">Upload Your Video</h2>
        <p className="text-gray-400">Select a video file to generate thumbnail previews</p>
      </div>

      <div className="space-y-4">
        <div
          className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-300 mb-2">
            {selectedFile ? selectedFile.name : 'Click to select a video file'}
          </p>
          <p className="text-sm text-gray-500">MP4 format recommended</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={!selectedFile || isProcessing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader className="animate-spin" size={20} />
              <span>{status === 'uploading' ? 'Uploading...' : 'Processing...'}</span>
            </>
          ) : (
            <>
              <Upload size={20} />
              <span>Upload & Process</span>
            </>
          )}
        </button>

        {status === 'complete' && (
          <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-center">
            Processing complete! Video is ready to play.
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoUploader;
