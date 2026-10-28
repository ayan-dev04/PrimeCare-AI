import React, { useEffect, useState } from 'react';
import { StreamVideo, StreamCall } from '@stream-io/video-react-sdk';
import API from '../api';
import { Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

/**
 * Modal that fetches a Stream Video token for the current user and renders the video call.
 */
export default function VideoConsultationModal({ appointment, currentUser, onClose }) {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useUser();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get(`/video/token?roomId=${appointment.videoRoomId}`);
        setTokenInfo(data);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to obtain video token');
      }
    })();
  }, [appointment.videoRoomId]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
        <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-8 max-w-sm text-center text-white">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-sm font-bold mb-1">Video Call Failed</h2>
          <p className="text-xs text-slate-400 mb-5">{error}</p>
          <button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-2xl">
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!tokenInfo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const { apiKey, token, roomId } = tokenInfo;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden shadow-2xl text-white">
        <div className="flex-1 overflow-hidden">
          <StreamVideo apiKey={apiKey} token={token}>
            <StreamCall channel={roomId} />
          </StreamVideo>
        </div>
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button onClick={onClose} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md">
            End Call
          </button>
        </div>
      </div>
    </div>
  );
}
