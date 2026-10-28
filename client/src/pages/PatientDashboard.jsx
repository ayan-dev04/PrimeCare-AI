import React, { useState, useEffect } from 'react';
import API from '../api';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Clock, Video, FileText, Activity, AlertTriangle,
    RotateCw, XCircle, Search, ShieldCheck, Heart, Download, Upload, Plus
} from 'lucide-react';
import VideoConsultationModal from '../components/VideoConsultationModal';
import PrescriptionModal from '../components/PrescriptionModal';

export default function PatientDashboard() {
    const { user, isLoaded } = useUser();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('appointments');
    const [appointments, setAppointments] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    const [activeVideoAppt, setActiveVideoAppt] = useState(null);
    const [activePrescription, setActivePrescription] = useState(null);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [rescheduleModalAppt, setRescheduleModalAppt] = useState(null);
    const [newDate, setNewDate] = useState('');
    const [newSlot, setNewSlot] = useState('10:00 AM');

    const [recordTitle, setRecordTitle] = useState('');
    const [recordCategory, setRecordCategory] = useState('Lab Report');
    const [recordDoctor, setRecordDoctor] = useState('');
    const [recordNotes, setRecordNotes] = useState('');
    const [recordFile, setRecordFile] = useState(null);

    const [emergencyContacts, setEmergencyContacts] = useState([
        { name: 'Hospital Emergency Desk', phone: '+91 (0731) 456-7890', relation: 'PrimeCare ER' },
        { name: 'National Ambulance', phone: '108', relation: 'Government EMS' }
    ]);
    const [newContactName, setNewContactName] = useState('');
    const [newContactPhone, setNewContactPhone] = useState('');

    useEffect(() => {
        if (!isLoaded) return;
        const role = user?.unsafeMetadata?.role || localStorage.getItem('primecare_user_role');
        if (role === 'doctor') navigate('/doctor-dashboard');
    }, [user, isLoaded, navigate]);

    const patientId = user?.id || user?.primaryEmailAddress?.emailAddress || 'clerk_patient';
    const patientEmail = user?.primaryEmailAddress?.emailAddress || '';
    const patientName = user?.fullName || 'Patient';

    useEffect(() => {
        if (patientId) fetchAllPatientData();
    }, [patientId]);

    const fetchAllPatientData = async () => {
        setLoading(true);
        try {
            const [apptRes, rxRes, recRes] = await Promise.all([
                API.get(`/appointments/patient/${encodeURIComponent(patientId)}`),
                API.get(`/appointments/prescriptions/patient/${encodeURIComponent(patientId)}`),
                API.get(`/appointments/records/patient/${encodeURIComponent(patientId)}`)
            ]);

            setAppointments(apptRes.data?.appointments || []);
            setPrescriptions(rxRes.data?.prescriptions || []);
            setRecords(recRes.data?.records || []);
        } catch (err) {
            console.error('Failed to load patient data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelAppointment = async (apptId) => {
        if (!window.confirm('Cancel this appointment?')) return;
        try {
            await API.put(`/appointments/${apptId}/cancel`);
            fetchAllPatientData();
        } catch (err) {
            alert('Cancellation failed.');
        }
    };

    const handleRescheduleSubmit = async (e) => {
        e.preventDefault();
        if (!newDate || !newSlot) return alert('Choose new date and slot.');
        try {
            await API.put(`/appointments/${rescheduleModalAppt._id}/reschedule`, { date: newDate, timeSlot: newSlot });
            setRescheduleModalAppt(null);
            fetchAllPatientData();
        } catch (err) {
            alert('Reschedule failed.');
        }
    };

    const handleUploadRecord = async (e) => {
        e.preventDefault();
        if (!recordTitle) return alert('Title required');

        try {
            const formData = new FormData();
            formData.append('patientId', patientId);
            formData.append('patientName', patientName);
            formData.append('title', recordTitle);
            formData.append('category', recordCategory);
            formData.append('doctorName', recordDoctor || 'Consultant');
            formData.append('notes', recordNotes);
            formData.append('uploadedBy', 'patient');
            if (recordFile) formData.append('file', recordFile);

            await API.post('/appointments/records', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setUploadModalOpen(false);
            setRecordTitle('');
            setRecordFile(null);
            fetchAllPatientData();
        } catch (err) {
            alert('Upload failed.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex justify-between items-center">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 bg-white/10 px-3 py-1 rounded-full">Patient Health Hub</span>
                        <h1 className="text-2xl sm:text-3xl font-black mt-2">Welcome, {patientName}</h1>
                    </div>
                    <button onClick={() => navigate('/book-appointment')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-2xl text-xs sm:text-sm">
                        + Book New Consultation
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                    {[
                        { id: 'appointments', label: 'My Appointments & Queue', icon: Calendar },
                        { id: 'prescriptions', label: 'E-Prescriptions', icon: FileText },
                        { id: 'records', label: 'Medical Records & Labs', icon: Activity },
                        { id: 'sos', label: 'Emergency SOS', icon: AlertTriangle }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${active ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                            >
                                <Icon className="w-4 h-4" /> {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* TAB 1: APPOINTMENTS */}
                {activeTab === 'appointments' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {appointments.map(appt => (
                            <div key={appt._id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <span className="font-mono text-xs font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl">Token: {appt.tokenNumber}</span>
                                    <h3 className="font-bold text-slate-900 text-base mt-3">{appt.doctor?.name || 'Assigned Specialist'}</h3>
                                    <p className="text-xs text-indigo-600 font-semibold mb-3">{appt.department}</p>
                                    <p className="text-xs text-slate-600">{appt.date} • {appt.timeSlot}</p>
                                </div>
                                {appt.consultationType === 'video' && (
                                    <button onClick={() => setActiveVideoAppt(appt)} className="mt-4 bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl">
                                        Join Video Call Room
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB 2: PRESCRIPTIONS */}
                {activeTab === 'prescriptions' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {prescriptions.map(rx => (
                            <div key={rx._id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">{rx.diagnosis}</h3>
                                    <p className="text-xs text-indigo-600 font-semibold mb-2">{rx.doctorName} • {rx.department}</p>
                                    <p className="text-xs text-slate-500 mb-4">{rx.medicines?.length || 0} prescribed medications</p>
                                </div>
                                <button onClick={() => setActivePrescription(rx)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl">
                                    View & Download Prescription
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB 3: RECORDS */}
                {activeTab === 'records' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-black text-slate-900">Health Records Hub</h2>
                            <button onClick={() => setUploadModalOpen(true)} className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl">Upload Report</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {records.map(rec => (
                                <div key={rec._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                                    <div>
                                        <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full">{rec.category}</span>
                                        <h4 className="font-bold text-slate-900 text-sm mt-1">{rec.title}</h4>
                                    </div>
                                    {rec.fileUrl && (
                                        <a href={`http://localhost:5000/api/doctors/files/record/${rec._id}?email=${encodeURIComponent(patientEmail)}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 hover:underline">
                                            Download
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 4: SOS */}
                {activeTab === 'sos' && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8">
                        <h2 className="text-xl font-black text-red-600 mb-4">24/7 Hospital Emergency SOS</h2>
                        <a href="tel:108" className="bg-red-600 text-white font-bold px-6 py-3 rounded-2xl inline-block">Call Ambulance (108)</a>
                    </div>
                )}
            </div>

            {activeVideoAppt && <VideoConsultationModal appointment={activeVideoAppt} onClose={() => setActiveVideoAppt(null)} />}
            {activePrescription && <PrescriptionModal prescription={activePrescription} onClose={() => setActivePrescription(null)} />}
        </div>
    );
}