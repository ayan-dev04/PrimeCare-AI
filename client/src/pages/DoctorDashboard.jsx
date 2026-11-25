import React, { useState, useEffect } from 'react';
import API, { SERVER_URL } from '../api';
import { io } from 'socket.io-client';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
    Activity, Users, Calendar, Video, FileText, CheckCircle, Clock,
    BarChart3, Stethoscope, ChevronRight, AlertCircle, Plus, Trash2, Printer, Upload, Download, FlaskConical, FolderOpen
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Convert "09:00 AM" (stored format) to the 24-hour value used by <input type="time">.
const toTimeInput = (value) => {
    const match = String(value || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return value || '09:00';
    let hour = Number(match[1]) % 12;
    if (/pm/i.test(match[3])) hour += 12;
    return `${String(hour).padStart(2, '0')}:${match[2]}`;
};

const initialsOf = (name = '') => {
    const parts = name.replace(/dr\.?/i, '').replace(/\(hod\)/i, '').trim().split(/\s+/);
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : (parts[0] || 'DR').slice(0, 2).toUpperCase();
};
import VideoConsultationModal from '../components/VideoConsultationModal';
import PrescriptionModal from '../components/PrescriptionModal';
import LabReportModal from '../components/LabReportModal';
import PatientFilesModal from '../components/PatientFilesModal';

export default function DoctorDashboard() {
    const { user: clerkUser, isLoaded } = useUser();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('queue');
    const [presence, setPresence] = useState('available');
    const [updatingPresence, setUpdatingPresence] = useState(false);
    const [doctorProfile, setDoctorProfile] = useState(null);
    const [scheduleDays, setScheduleDays] = useState([]);
    const [scheduleStart, setScheduleStart] = useState('09:00');
    const [scheduleEnd, setScheduleEnd] = useState('17:00');
    const [savingSchedule, setSavingSchedule] = useState(false);

    const [appointments, setAppointments] = useState([]);
    const [patientRecords, setPatientRecords] = useState([]);
    const [labReports, setLabReports] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    const [activeVideoAppt, setActiveVideoAppt] = useState(null);
    const [activeRxAppt, setActiveRxAppt] = useState(null);
    const [activeLabAppt, setActiveLabAppt] = useState(null);
    const [activeFilesAppt, setActiveFilesAppt] = useState(null);
    const [viewPrescription, setViewPrescription] = useState(null);

    const [diagnosis, setDiagnosis] = useState('');
    const [bp, setBp] = useState('120/80 mmHg');
    const [pulse, setPulse] = useState('74 bpm');
    const [temp, setTemp] = useState('98.6 °F');
    const [spo2, setSpo2] = useState('99%');
    const [advice, setAdvice] = useState('');
    const [followUp, setFollowUp] = useState('');
    const [medicines, setMedicines] = useState([
        { name: '', dosage: '500mg', frequency: '1-0-1 (After Meals)', duration: '5 Days' }
    ]);

    const storedUser = (() => {
        try {
            return JSON.parse(localStorage.getItem('primecare_user') || 'null');
        } catch {
            return null;
        }
    })();

    const doctorEmail = clerkUser?.primaryEmailAddress?.emailAddress || storedUser?.email || '';

    useEffect(() => {
        const role = clerkUser?.unsafeMetadata?.role || storedUser?.role || localStorage.getItem('primecare_user_role');
        if (role === 'patient') navigate('/patient-dashboard');
    }, [clerkUser, isLoaded, storedUser?.role, navigate]);

    useEffect(() => {
        fetchDoctorData();
    }, [doctorEmail, isLoaded]);

    // Live Socket.IO listener for instant doctor queue updates
    useEffect(() => {
        if (!doctorProfile?._id) return;
        const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
        socket.emit('join_doctor', doctorProfile._id);

        socket.on('queue_updated', () => fetchDoctorData());
        socket.on('doctor_queue_updated', () => fetchDoctorData());

        return () => {
            socket.disconnect();
        };
    }, [doctorProfile?._id]);

    const fetchDoctorData = async () => {
        setLoading(true);
        try {
            // The backend resolves the Doctor record from the signed-in email,
            // including doctors who are currently marked absent.
            const { data: profileData } = await API.get('/auth/me');
            const matchedDoc = profileData?.profile?.role === 'doctor' ? profileData.profile : null;

            if (!matchedDoc) {
                setDoctorProfile(null);
                setLoading(false);
                return;
            }

            setDoctorProfile(matchedDoc);
            setPresence(matchedDoc.presenceStatus || 'available');
            setScheduleDays(matchedDoc.days || DAYS.slice(0, 5));
            setScheduleStart(toTimeInput(matchedDoc.workingHours?.start));
            setScheduleEnd(toTimeInput(matchedDoc.workingHours?.end));

            const [apptRes, recordsRes, labsRes, rxRes, analyticsRes] = await Promise.all([
                API.get(`/doctors/appointments/${matchedDoc._id}`),
                API.get(`/appointments/records/doctor/${matchedDoc._id}`),
                API.get(`/doctors/lab-reports/doctor/${matchedDoc._id}`),
                API.get(`/doctors/prescriptions/doctor/${matchedDoc._id}`),
                API.get(`/appointments/doctor/${matchedDoc._id}/analytics`)
            ]);

            setAppointments(apptRes.data?.appointments || []);
            setPatientRecords(recordsRes.data?.records || []);
            setLabReports(labsRes.data?.labReports || []);
            setPrescriptions(rxRes.data?.prescriptions || []);
            setAnalytics(analyticsRes.data || null);
        } catch (err) {
            console.error('Failed to load doctor dashboard:', err);
            setDoctorProfile(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSchedule = async () => {
        if (!doctorProfile?._id) return;
        if (!scheduleDays.length) return alert('Select at least one working day.');
        if (scheduleStart >= scheduleEnd) return alert('Shift end time must be after start time.');
        try {
            setSavingSchedule(true);
            await API.put('/doctors/availability', {
                doctorId: doctorProfile._id,
                days: scheduleDays,
                workingHours: { start: scheduleStart, end: scheduleEnd }
            });
            alert('Schedule updated successfully.');
            fetchDoctorData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update schedule.');
        } finally {
            setSavingSchedule(false);
        }
    };

    const toggleScheduleDay = (day) => {
        setScheduleDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    };

    const handleUpdateStatus = async (appt, status) => {
        try {
            await API.patch(`/appointments/${appt._id}/consultation`, { status });
            fetchDoctorData();
        } catch (err) {
            alert('Could not update appointment status.');
        }
    };

    const handlePresenceChange = async (newStatus) => {
        if (!doctorProfile?._id) return;
        try {
            setUpdatingPresence(true);
            await API.put('/doctors/presence', { doctorId: doctorProfile._id, presenceStatus: newStatus });
            setPresence(newStatus);
            fetchDoctorData();
        } catch (err) {
            alert('Failed to update presence.');
        } finally {
            setUpdatingPresence(false);
        }
    };

    const handleStartConsultation = async (appt) => {
        try {
            await API.patch(`/appointments/${appt._id}/consultation`, { status: 'in-progress' });
            if (appt.consultationType === 'video') setActiveVideoAppt(appt);
            fetchDoctorData();
        } catch (err) {
            alert('Could not start consultation.');
        }
    };

    const handleOpenRxModal = (appt) => {
        setActiveRxAppt(appt);
        setDiagnosis(appt.reason || 'General Medical Examination');
    };

    const handleAddMedicine = () => {
        setMedicines(prev => [...prev, { name: '', dosage: '500mg', frequency: '1-0-1 (After Meals)', duration: '5 Days' }]);
    };

    const handleRemoveMedicine = (index) => {
        setMedicines(prev => prev.filter((_, i) => i !== index));
    };

    const handleMedicineChange = (index, field, value) => {
        setMedicines(prev => {
            const updated = [...prev];
            updated[index][field] = value;
            return updated;
        });
    };

    const handleSubmitPrescription = async (e) => {
        e.preventDefault();
        if (!activeRxAppt || !diagnosis.trim()) return alert('Diagnosis is required.');

        try {
            await API.post('/appointments/prescriptions', {
                appointmentId: activeRxAppt._id,
                patientId: activeRxAppt.patient || activeRxAppt.patientEmail,
                patientName: activeRxAppt.patientName,
                doctorId: doctorProfile._id,
                doctorName: doctorProfile.name,
                department: doctorProfile.department,
                diagnosis,
                vitals: { bloodPressure: bp, pulseRate: pulse, temperature: temp, spO2: spo2 },
                medicines: medicines.filter(m => m.name.trim()),
                clinicalAdvice: advice,
                followUpDate: followUp
            });

            setActiveRxAppt(null);
            fetchDoctorData();
            alert('Prescription successfully issued and synchronized!');
        } catch (err) {
            alert('Prescription generation failed.');
        }
    };

    const handlePublishLabReport = async (payload) => {
        try {
            await API.post('/doctors/lab-reports', payload);
            setActiveLabAppt(null);
            fetchDoctorData();
            alert('Lab report published successfully.');
        } catch (err) {
            alert('Lab report publishing failed.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Profile Header */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-2xl text-white">
                            {doctorProfile?.avatar || initialsOf(doctorProfile?.name || clerkUser?.fullName || '')}
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black">
                                {doctorProfile?.name || clerkUser?.fullName || storedUser?.name || 'Doctor Profile'}
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                                {doctorProfile
                                    ? `${doctorProfile.department} Department • ${doctorProfile.qualification || 'Medical Specialist'} • ${doctorProfile.experienceYears || 0} Years Experience`
                                    : 'PrimeCare Medical Specialist'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-2xl border border-slate-800 flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400 px-3 uppercase">OPD Status:</span>
                        {[
                            { id: 'available', label: 'Available', color: 'bg-emerald-600 text-white' },
                            { id: 'on-duty', label: 'On Duty', color: 'bg-indigo-600 text-white' },
                            { id: 'on-break', label: 'Break', color: 'bg-amber-600 text-white' },
                            { id: 'absent', label: 'Off', color: 'bg-red-600 text-white' }
                        ].map(st => (
                            <button
                                key={st.id}
                                disabled={updatingPresence}
                                onClick={() => handlePresenceChange(st.id)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${presence === st.id ? st.color : 'text-slate-400 hover:text-white'}`}
                            >
                                {st.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                    {[
                        { id: 'queue', label: 'Live Queue', icon: Users },
                        { id: 'records', label: 'Patient Records', icon: FileText },
                        { id: 'labs', label: 'Lab Reports', icon: FlaskConical },
                        { id: 'prescriptions', label: 'Issued Prescriptions', icon: FileText },
                        { id: 'schedule', label: 'My Schedule', icon: Calendar },
                        { id: 'analytics', label: 'Analytics', icon: BarChart3 }
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

                {/* TAB 1: QUEUE */}
                {activeTab === 'queue' && (
                    <div className="space-y-4">
                        {loading ? (
                            <div className="p-12 text-center text-slate-500 text-sm">Loading queue...</div>
                        ) : appointments.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 text-sm">
                                No active consultations in queue.
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="divide-y divide-slate-100">
                                    {appointments.map(appt => {
                                        const isInProgress = appt.status === 'in-progress';
                                        return (
                                            <div key={appt._id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-900 flex flex-col items-center justify-center font-black shrink-0">
                                                        <span className="text-[10px] text-indigo-500">TOKEN</span>
                                                        <span className="text-sm">#{appt.queueNumber}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-sm">{appt.patientName}</h3>
                                                        <p className="text-xs text-slate-500 mt-1">Complaint: <span className="font-semibold text-slate-700">{appt.reason}</span></p>
                                                        <p className="text-[11px] text-slate-400 mt-1">{appt.date} • {appt.timeSlot} • {appt.consultationType === 'video' ? 'Video' : 'In-Person'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${appt.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                        appt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                            appt.status === 'in-progress' ? 'bg-amber-100 text-amber-700' :
                                                                appt.status === 'no-show' ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-blue-100 text-blue-700'}`}>
                                                        {appt.status}
                                                    </span>
                                                    {appt.status === 'scheduled' && (
                                                        <button onClick={() => handleStartConsultation(appt)} className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl">
                                                            Start Consultation
                                                        </button>
                                                    )}
                                                    {isInProgress && (
                                                        <>
                                                            <button onClick={() => handleOpenRxModal(appt)} className="bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl">
                                                                E-Prescription
                                                            </button>
                                                            <button onClick={() => setActiveLabAppt(appt)} className="bg-teal-600 text-white text-xs font-bold px-3 py-2 rounded-xl">
                                                                Lab Report
                                                            </button>
                                                            <button onClick={() => handleUpdateStatus(appt, 'completed')} className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl">
                                                                Complete
                                                            </button>
                                                        </>
                                                    )}
                                                    <button onClick={() => setActiveFilesAppt(appt)} className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-2 rounded-xl">
                                                        Patient Files
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: RECORDS */}
                {activeTab === 'records' && (
                    <div className="space-y-4">
                        <h2 className="text-base font-bold text-slate-900">Authorized Patient Health Records</h2>
                        {patientRecords.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 text-sm">No health records available.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {patientRecords.map(rec => (
                                    <div key={rec._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{rec.category}</span>
                                            <h4 className="font-bold text-slate-900 text-sm mt-2">{rec.title}</h4>
                                            <p className="text-xs text-slate-500">Patient: <strong className="text-slate-800">{rec.patientName}</strong></p>
                                        </div>
                                        {rec.fileUrl && (
                                            <a href={`${SERVER_URL}/api/doctors/files/record/${rec._id}?email=${encodeURIComponent(doctorEmail)}`} target="_blank" rel="noopener noreferrer" className="mt-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 rounded-xl text-center">
                                                Inspect Document
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: LAB REPORTS */}
                {activeTab === 'labs' && (
                    <div className="space-y-4">
                        <h2 className="text-base font-bold text-slate-900">Issued Pathology Reports</h2>
                        {labReports.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 text-sm">No lab reports issued yet.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {labReports.map(r => (
                                    <div key={r._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm">{r.panelName}</h4>
                                            <p className="text-xs text-slate-500 mt-1">Patient: <strong className="text-slate-800">{r.patientName}</strong></p>
                                        </div>
                                        <a href={`${SERVER_URL}/api/doctors/lab-reports/download/${r._id}?email=${encodeURIComponent(doctorEmail)}`} target="_blank" rel="noopener noreferrer" className="mt-4 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2 rounded-xl text-center">
                                            Download Branded PDF
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: ISSUED PRESCRIPTIONS */}
                {activeTab === 'prescriptions' && (
                    <div className="space-y-4">
                        <h2 className="text-base font-bold text-slate-900">Issued E-Prescriptions</h2>
                        {prescriptions.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500 text-sm">No prescriptions issued yet.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {prescriptions.map(rx => (
                                    <div key={rx._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm">{rx.diagnosis}</h4>
                                            <p className="text-xs text-slate-500 mt-1">Patient: <strong className="text-slate-800">{rx.patientName}</strong></p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">{rx.medicines?.length || 0} medications</p>
                                        </div>
                                        <button onClick={() => setViewPrescription(rx)} className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl">
                                            View & Download PDF
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 5: SCHEDULE */}
                {activeTab === 'schedule' && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 max-w-3xl">
                        <div>
                            <h2 className="text-base font-black text-slate-900">OPD Working Schedule</h2>
                            <p className="text-xs text-slate-500 mt-1">These days and hours control the slots patients can book.</p>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-2">Working Days</label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleScheduleDay(day)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${scheduleDays.includes(day)
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Shift Start</label>
                                <input
                                    type="time"
                                    value={scheduleStart}
                                    onChange={e => setScheduleStart(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Shift End</label>
                                <input
                                    type="time"
                                    value={scheduleEnd}
                                    onChange={e => setScheduleEnd(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveSchedule}
                            disabled={savingSchedule}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white font-bold text-xs px-5 py-3 rounded-2xl"
                        >
                            {savingSchedule ? 'Saving...' : 'Save Schedule'}
                        </button>
                    </div>
                )}

                {/* TAB 6: ANALYTICS */}
                {activeTab === 'analytics' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Consultations', value: analytics?.summary?.totalAppointments || appointments.length, color: 'text-indigo-600' },
                            { label: 'Completed', value: analytics?.summary?.completed || appointments.filter(a => a.status === 'completed').length, color: 'text-emerald-600' },
                            { label: 'In Progress', value: appointments.filter(a => a.status === 'in-progress').length, color: 'text-amber-600' },
                            { label: 'Lab Reports Issued', value: labReports.length, color: 'text-teal-600' },
                            { label: 'Prescriptions Issued', value: prescriptions.length, color: 'text-blue-600' },
                            { label: 'Patient Records', value: patientRecords.length, color: 'text-purple-600' }
                        ].map(card => (
                            <div key={card.label} className="bg-white p-6 rounded-3xl border border-slate-200 text-center">
                                <span className="text-xs text-slate-500 block mb-1">{card.label}</span>
                                <span className={`text-3xl font-black ${card.color}`}>{card.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {activeVideoAppt && <VideoConsultationModal appointment={activeVideoAppt} currentUser={{ name: doctorProfile?.name, role: 'doctor' }} onClose={() => setActiveVideoAppt(null)} />}
            {viewPrescription && <PrescriptionModal prescription={viewPrescription} onClose={() => setViewPrescription(null)} />}
            {activeLabAppt && <LabReportModal appointment={activeLabAppt} doctorProfile={doctorProfile} onClose={() => setActiveLabAppt(null)} onPublish={handlePublishLabReport} />}
            {activeFilesAppt && doctorProfile && <PatientFilesModal appointment={activeFilesAppt} doctorProfile={doctorProfile} onClose={() => setActiveFilesAppt(null)} />}

            {/* E-Prescription Modal */}
            {activeRxAppt && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
                    <form onSubmit={handleSubmitPrescription} className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 className="text-base font-black text-slate-900">Issue E-Prescription</h3>
                            <button type="button" onClick={() => setActiveRxAppt(null)} className="text-slate-400 font-bold text-xs">Close</button>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Clinical Diagnosis *</label>
                            <input type="text" required value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="w-full text-xs p-2.5 rounded-xl border border-slate-200" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700">Prescribed Medications</label>
                            {medicines.map((m, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <input type="text" placeholder="Medicine Name" value={m.name} onChange={e => handleMedicineChange(idx, 'name', e.target.value)} className="flex-2 text-xs p-2 rounded-lg border border-slate-200" required />
                                    <input type="text" placeholder="Dosage" value={m.dosage} onChange={e => handleMedicineChange(idx, 'dosage', e.target.value)} className="flex-1 text-xs p-2 rounded-lg border border-slate-200" />
                                    <input type="text" placeholder="Frequency" value={m.frequency} onChange={e => handleMedicineChange(idx, 'frequency', e.target.value)} className="flex-1 text-xs p-2 rounded-lg border border-slate-200" />
                                    <input type="text" placeholder="Duration" value={m.duration} onChange={e => handleMedicineChange(idx, 'duration', e.target.value)} className="w-20 text-xs p-2 rounded-lg border border-slate-200" />
                                    {medicines.length > 1 && <button type="button" onClick={() => handleRemoveMedicine(idx)} className="text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                                </div>
                            ))}
                            <button type="button" onClick={handleAddMedicine} className="text-xs text-indigo-600 font-bold">+ Add Drug</button>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Clinical Remarks & Diet</label>
                            <input type="text" value={advice} onChange={e => setAdvice(e.target.value)} className="w-full text-xs p-2.5 rounded-xl border border-slate-200" />
                        </div>

                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-2xl text-xs transition">
                            Issue & Save Prescription
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}