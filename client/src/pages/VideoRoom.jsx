import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import API from '../api';
import { StreamVideo, StreamCall } from '@stream-io/video-react-sdk';
import { AlertCircle, Loader2 } from 'lucide-react';

// Deep-link landing page for email join buttons: /video-consultation?room=<videoRoomId>&token=<tokenNumber>
export default function VideoRoom() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const [appt, setAppt] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const { data } = await API.get(`/appointments/room/${params.get('room')}`);
                setAppt(data.appointment);
            } catch (err) {
                setError(err.response?.data?.error || 'Could not load this consultation room.');
            }
        })();
    }, []);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
                <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-8 max-w-sm text-center text-white shadow-2xl">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <h2 className="text-sm font-bold mb-1">Room Access Failed</h2>
                    <p className="text-xs text-slate-400 mb-5">{error}</p>
                    <button onClick={() => navigate('/')} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-2xl">
                        Return to Hospital Portal
                    </button>
                </div>
            </div>
        );
    }

    if (!appt) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <span className="text-xs font-semibold">Verifying secure consultation room...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <VideoConsultationModal
                appointment={appt}
                currentUser={{
                    name: user?.fullName || `${appt.patientName}`,
                    role: params.get('role') || 'patient'
                }}
                onClose={() => navigate('/')}
            />
        </div>
    );
}
