import React, { useState, useEffect } from 'react';
import API, { SERVER_URL } from '../api';
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
    const [labReports, setLabReports] = useState([]);
    const [profile, setProfile] = useState(null);
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

    const storedUser = (() => {
        try {
            return JSON.parse(localStorage.getItem('primecare_user') || 'null');
        } catch {
            return null;
        }
    })();

    const patientEmail = (profile?.email || user?.primaryEmailAddress?.emailAddress || storedUser?.email || '').toLowerCase();
    const patientName = profile?.name || user?.fullName || storedUser?.name || 'Patient';

    useEffect(() => {
        let active = true;
        API.get('/auth/me')
            .then(res => { if (active && res.data?.profile) setProfile(res.data.profile); })
            .catch(() => { if (active && storedUser) setProfile(storedUser); });
        return () => { active = false; };
    }, [user?.id, storedUser?.email]);

    useEffect(() => {
        if (patientEmail) fetchAllPatientData();
    }, [user?.id, patientEmail]);

    const fetchAllPatientData = async () => {
        setLoading(true);
        try {
            const key = encodeURIComponent(patientEmail);
            const [apptRes, rxRes, recRes, labRes] = await Promise.all([
                API.get(`/appointments/patient/${key}`),
                API.get(`/appointments/prescriptions/patient/${key}`),
                API.get(`/appointments/records/patient/${key}`),
                API.get(`/doctors/lab-reports/patient/${key}`)
            ]);

            setAppointments(apptRes.data?.appointments || []);
            setPrescriptions(rxRes.data?.prescriptions || []);
            setRecords(recRes.data?.records || []);
            setLabReports(labRes.data?.labReports || []);
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
            formData.append('patientId', patientEmail);
            formData.append('patientEmail', patientEmail);
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
                        { id: 'labs', label: 'Lab Reports', icon: FileText },
                        { id: 'records', label: 'Medical Records', icon: Activity },
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
                    <div className="space-y-4">
                        {!loading && appointments.length === 0 && (
                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 text-sm">
                                No appointments yet. Book a consultation to get started.
                            </div>
                        )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {appointments.map(appt => (
                            <div key={appt._id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="font-mono text-xs font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl">Token: {appt.tokenNumber}</span>
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${appt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                            appt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                            appt.status === 'in-progress' ? 'bg-amber-100 text-amber-700' :
                                            appt.status === 'no-show' ? 'bg-orange-100 text-orange-700' :
                                            'bg-blue-100 text-blue-700'}`}>
                                            {appt.status}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-base mt-3">{appt.doctor?.name || 'Assigned Specialist'}</h3>
                                    <p className="text-xs text-indigo-600 font-semibold mb-3">{appt.department}</p>
                                    <p className="text-xs text-slate-600">{appt.date} • {appt.timeSlot}</p>
                                    <p className="text-xs text-slate-500 mt-1">{appt.reason}</p>
                                </div>
                                <div className="space-y-2 mt-4">
                                    {appt.consultationType === 'video' && appt.status === 'scheduled' && (
                                        <button onClick={() => setActiveVideoAppt(appt)} className="w-full bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl">
                                            Join Video Call Room
                                        </button>
                                    )}
                                    {appt.status === 'scheduled' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setRescheduleModalAppt(appt); setNewDate(appt.date); setNewSlot(appt.timeSlot); }}
                                                className="flex-1 bg-slate-100 text-slate-700 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1"
                                            >
                                                <RotateCw className="w-3.5 h-3.5" /> Reschedule
                                            </button>
                                            <button
                                                onClick={() => handleCancelAppointment(appt._id)}
                                                className="flex-1 bg-red-50 text-red-600 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1"
                                            >
                                                <XCircle className="w-3.5 h-3.5" /> Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    </div>
                )}

                {/* TAB 3: LAB REPORTS */}
                {activeTab === 'labs' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {labReports.length === 0 && (
                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 text-sm md:col-span-2 lg:col-span-3">
                                No lab reports uploaded by your doctor yet.
                            </div>
                        )}
                        {labReports.map(report => (
                            <div key={report._id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">Lab Report</span>
                                    <h3 className="font-bold text-slate-900 text-sm mt-2">{report.panelName}</h3>
                                    <p className="text-xs text-indigo-600 font-semibold mt-1">{report.doctorName} • {report.department}</p>
                                    <p className="text-xs text-slate-500 mt-1">{new Date(report.createdAt || Date.now()).toLocaleDateString('en-IN')}</p>
                                    {report.summaryImpression && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{report.summaryImpression}</p>}
                                </div>
                                <a
                                    href={`${SERVER_URL}/api/doctors/lab-reports/download/${report._id}?email=${encodeURIComponent(patientEmail)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-4 w-full bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-1.5"
                                >
                                    <Download className="w-3.5 h-3.5" /> Download Lab Report PDF
                                </a>
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
                                        <a
                                            href={rec.fileUrl.startsWith('/api/')
                                                ? `${SERVER_URL}${rec.fileUrl}${rec.fileUrl.includes('?') ? '&' : '?'}email=${encodeURIComponent(patientEmail)}`
                                                : `${SERVER_URL}/api/doctors/files/record/${rec._id}?email=${encodeURIComponent(patientEmail)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-bold text-indigo-600 hover:underline"
                                        >
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

            {rescheduleModalAppt && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleRescheduleSubmit} className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 text-base">Reschedule Appointment</h3>
                            <button type="button" onClick={() => setRescheduleModalAppt(null)} className="text-slate-400">✕</button>
                        </div>
                        <input
                            type="date"
                            required
                            value={newDate}
                            onChange={e => setNewDate(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        />
                        <input
                            type="text"
                            required
                            placeholder="Time slot (e.g. 10:00 AM)"
                            value={newSlot}
                            onChange={e => setNewSlot(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        />
                        <button type="submit" className="w-full bg-indigo-600 text-white font-bold text-xs py-3 rounded-2xl">
                            Confirm New Slot
                        </button>
                    </form>
                </div>
            )}

            {uploadModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleUploadRecord} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 text-base">Upload Medical Record</h3>
                            <button type="button" onClick={() => setUploadModalOpen(false)} className="text-slate-400">✕</button>
                        </div>
                        <input
                            type="text" required placeholder="Document title"
                            value={recordTitle} onChange={e => setRecordTitle(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        />
                        <select
                            value={recordCategory} onChange={e => setRecordCategory(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                        >
                            {['Lab Report', 'Prescription', 'Discharge Summary', 'Imaging/Scan', 'Diagnostic Report', 'Other'].map(c => (
                                <option key={c}>{c}</option>
                            ))}
                        </select>
                        <input
                            type="text" placeholder="Doctor name (optional)"
                            value={recordDoctor} onChange={e => setRecordDoctor(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        />
                        <textarea
                            rows={2} placeholder="Notes (optional)"
                            value={recordNotes} onChange={e => setRecordNotes(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        />
                        <input
                            type="file" accept=".pdf,.doc,.docx,image/*"
                            onChange={e => setRecordFile(e.target.files[0])}
                            className="w-full text-xs p-2"
                        />
                        <button type="submit" className="w-full bg-indigo-600 text-white font-bold text-xs py-3 rounded-2xl">
                            Upload Record
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}