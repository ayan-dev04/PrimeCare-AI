import React, { useState, useEffect } from 'react';
import API from '../api';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
    Activity, Users, Calendar, ShieldCheck, Stethoscope, Download,
    Search, Plus, Trash2, Edit3, RefreshCw, AlertTriangle, CheckCircle2, X, Lock, Video, Eye
} from 'lucide-react';

// Forensic audit stamp: exact date & time to the second, local hospital clock (YYYY-MM-DD HH:mm:ss)
function formatAuditStamp(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function AdminDashboard() {
    const { user, isLoaded } = useUser();
    const navigate = useNavigate();

    // Single admin identity header shared by every /api/admin/* call (RBAC via verifyAdmin)
    const adminEmail = user?.primaryEmailAddress?.emailAddress || 'primecare.hospital.admin@gmail.com';

    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'doctors' | 'users' | 'appointments' | 'security'
    const [metrics, setMetrics] = useState(null);
    const [doctors, setDoctors] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [securityLogs, setSecurityLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [backupMsg, setBackupMsg] = useState('');
    const [detailAppt, setDetailAppt] = useState(null); // appointment details viewer

    // Doctor modal state
    const [doctorModalOpen, setDoctorModalOpen] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState(null);
    const [docName, setDocName] = useState('');
    const [docEmail, setDocEmail] = useState('');
    const [docDept, setDocDept] = useState('Cardiology');
    const [docQual, setDocQual] = useState('MBBS, MD');
    const [docAge, setDocAge] = useState(30);
    const [docDegree, setDocDegree] = useState('MBBS, MD - General Medicine');
    const [docCollege, setDocCollege] = useState('');
    const [docAwards, setDocAwards] = useState('');   // one award per line (backend splits on \n)
    const [docExp, setDocExp] = useState(10);
    const [docFee, setDocFee] = useState(1500);

    // User edit modal state
    const [editingUser, setEditingUser] = useState(null);
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [consultTypeFilter, setConsultTypeFilter] = useState('All'); // 'All' | 'in-person' | 'video'

    // Access authorization guard
    useEffect(() => {
        if (!isLoaded) return;
        const role = user?.unsafeMetadata?.role || localStorage.getItem('primecare_user_role');
        const userEmail = user?.primaryEmailAddress?.emailAddress || '';
        const isDesignatedAdmin = userEmail.toLowerCase() === 'primecare.hospital.admin@gmail.com';

        if (role !== 'admin' && !isDesignatedAdmin) {
            // Non-admins redirected to patient or doctor portal
            if (role === 'doctor') navigate('/doctor-dashboard');
            else navigate('/patient-dashboard');
        }
    }, [user, isLoaded, navigate]);

    useEffect(() => {
        fetchAllAdminData();
    }, []);

    const fetchAllAdminData = async () => {
        setLoading(true);
        try {
            const headers = { 'x-user-email': adminEmail };

            // allSettled: one failing endpoint never blanks the other admin sections
            const [metricsRes, docRes, userRes, apptRes, logsRes] = await Promise.allSettled([
                API.get('/admin/metrics', { headers }),
                API.get('/admin/doctors', { headers }),
                API.get('/admin/users', { headers }),
                API.get('/admin/appointments', { headers }),
                API.get('/admin/security-logs', { headers })
            ]);

            const ok = r => r.status === 'fulfilled' ? r.value?.data : null;

            const mData = ok(metricsRes);
            setMetrics(mData?.metrics ? { ...mData.metrics, departmentStats: mData.departmentStats, trendStats: mData.trendStats } : null);
            setDoctors(ok(docRes)?.doctors || []);
            setUsersList(ok(userRes)?.users || []);
            setAppointments(ok(apptRes)?.appointments || []);
            setSecurityLogs(ok(logsRes)?.logs || []);
        } catch (err) {
            console.error('Failed to load admin dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    // Live telemetry refresh — re-aggregates hospital metrics every 30s (charts stay real-time)
    const refreshMetrics = async () => {
        try {
            const { data } = await API.get('/admin/metrics', { headers: { 'x-user-email': adminEmail } });
            if (data?.metrics) {
                setMetrics({ ...data.metrics, departmentStats: data.departmentStats, trendStats: data.trendStats });
            }
        } catch { /* retain last known good metrics on transient failures */ }
    };

    useEffect(() => {
        const poll = setInterval(refreshMetrics, 30000);
        return () => clearInterval(poll);
    }, []);

    // Doctor CRUD Operations
    const handleSaveDoctor = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: docName,
                email: docEmail,
                department: docDept,
                qualification: docQual,
                degree: docDegree,
                college: docCollege,
                age: docAge,
                awards: docAwards,
                experienceYears: docExp,
                consultationFee: docFee
            };

            if (editingDoctor) {
                await API.put(`/admin/doctors/${editingDoctor._id}`, payload, { headers: { 'x-user-email': adminEmail } });
            } else {
                await API.post('/admin/doctors', payload, { headers: { 'x-user-email': adminEmail } });
            }

            setDoctorModalOpen(false);
            setEditingDoctor(null);
            fetchAllAdminData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to save doctor.');
        }
    };

    const handleDeleteDoctor = async (id, name) => {
        if (!window.confirm(`Are you sure you want to remove Dr. ${name} from hospital records?`)) return;
        try {
            await API.delete(`/admin/doctors/${id}`, { headers: { 'x-user-email': adminEmail } });
            fetchAllAdminData();
        } catch (err) {
            alert(err.response?.data?.error || 'Delete failed.');
        }
    };

    // Role Modification
    const handleRoleChange = async (userId, newRole) => {
        try {
            await API.patch(`/admin/users/${userId}/role`, { role: newRole }, { headers: { 'x-user-email': adminEmail } });
            fetchAllAdminData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update role.');
        }
    };

    // Edit user details (name / email)
    const handleSaveUserDetails = async (e) => {
        e.preventDefault();
        try {
            await API.patch(`/admin/users/${editingUser._id}/details`, {
                name: userName, email: userEmail
            }, { headers: { 'x-user-email': adminEmail } });
            setEditingUser(null);
            fetchAllAdminData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update user details.');
        }
    };

    // Appointment Administrative Override (status sync queue estimates)
    const handleAppointmentStatusOverride = async (apptId, newStatus) => {
        try {
            await API.patch(`/admin/appointments/${apptId}/override`, { status: newStatus }, { headers: { 'x-user-email': adminEmail } });
            fetchAllAdminData();
        } catch (err) {
            alert('Override failed.');
        }
    };

    // Permanent Appointment deletion (queue re-synced automatically by backend)
    const handleDeleteAppointment = async (id, token) => {
        if (!window.confirm(`Permanently delete appointment Token ${token}? The queue will be re-synced.`)) return;
        try {
            await API.delete(`/admin/appointments/${id}`, { headers: { 'x-user-email': adminEmail } });
            fetchAllAdminData();
        } catch (err) {
            alert('Appointment deletion failed.');
        }
    };

    // Secure user account removal (cascades appointments & records via backend)
    const handleDeleteUser = async (id, email) => {
        if (!window.confirm(`Delete account ${email} along with its appointments and records? This cannot be undone.`)) return;
        try {
            await API.delete(`/admin/users/${id}`, { headers: { 'x-user-email': adminEmail } });
            fetchAllAdminData();
        } catch (err) {
            alert(err.response?.data?.error || 'User deletion failed.');
        }
    };

    // Database JSON Backup Export (server streams an archival snapshot of every core collection)
    const handleDownloadBackup = async () => {
        try {
            setBackupMsg('Generating backup snapshot...');
            const response = await API.get('/admin/backup', {
                headers: { 'x-user-email': adminEmail },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `primecare-hospital-backup-${Date.now()}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url); // release blob memory immediately after download

            const { summary } = JSON.parse(await new Blob([response.data]).text());
            setBackupMsg(`Snapshot exported (${summary.doctorsCount} doctors, ${summary.appointmentsCount} appointments).`);
            setTimeout(() => setBackupMsg(''), 4000);
        } catch (err) {
            setBackupMsg('');
            alert('Backup generation failed.');
        }
    };

    // Chart datasets derived from live backend aggregations (status pie + trend area)
    const STATUS_LABELS = { scheduled: 'Scheduled', 'in-progress': 'In Progress', completed: 'Completed', cancelled: 'Cancelled', 'no-show': 'No-Show', missed: 'Missed' };
    const STATUS_COLORS = { Scheduled: '#4f46e5', 'In Progress': '#f59e0b', Completed: '#10b981', Cancelled: '#ef4444', 'No-Show': '#f97316', Missed: '#94a3b8' };
    const statusPieData = metrics
        ? Object.entries(metrics.statusCounts || {}).map(([key, value]) => ({ name: STATUS_LABELS[key] || key, value }))
        : [];

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Banner */}
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black tracking-tight">PrimeCare Admin Portal</h1>
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-bold">
                                    Root Control
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Centralized administration, medical staff profiles, patient management, and live hospital telemetry.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2.5">
                            <button
                                onClick={handleDownloadBackup}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-sm transition"
                            >
                                <Download className="w-4 h-4" /> Export DB Backup (.JSON)
                            </button>
                            <button
                                onClick={fetchAllAdminData}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-2xl transition"
                                title="Refresh Hospital Telemetry"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        {backupMsg && (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> {backupMsg}
                            </span>
                        )}
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                    {[
                        { id: 'overview', label: 'Hospital Telemetry & Analytics', icon: Activity },
                        { id: 'doctors', label: `Medical Staff (${doctors.length})`, icon: Stethoscope },
                        { id: 'users', label: `User Roles (${usersList.length})`, icon: Users },
                        { id: 'appointments', label: `Appointment Management (${appointments.length})`, icon: Calendar },
                        { id: 'security', label: 'System Security & Audit Logs', icon: Lock }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${active ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* ──────── TAB 1: OVERVIEW & TELEMETRY ──────── */}
                {activeTab === 'overview' && metrics && (
                    <div className="space-y-6">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {[
                                { label: 'Active Specialists', val: `${metrics.activeDoctors} / ${metrics.totalDoctors}`, color: 'text-indigo-600' },
                                { label: 'Total Appointments', val: metrics.totalAppointments, color: 'text-blue-600' },
                                { label: "Today's OPD Volume", val: metrics.todayAppointments, color: 'text-cyan-600' },
                                { label: 'Completed Visits', val: metrics.completedVisits, color: 'text-emerald-600' },
                                { label: 'Registered Patients', val: metrics.totalPatients, color: 'text-violet-600' },
                                { label: 'Estimated Revenue', val: metrics.estimatedRevenue, color: 'text-slate-900' }
                            ].map((s, i) => (
                                <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">{s.label}</span>
                                    <span className={`text-3xl font-black ${s.color}`}>{s.val}</span>
                                </div>
                            ))}
                        </div>

                        {/* Chart & Department Breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-900 text-sm">Weekly OPD Visit Trends</h3>
                                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> LIVE · 30s
                                    </span>
                                </div>
                                {/* Live recharts area — feeds directly from backend 7-day aggregation */}
                                <ResponsiveContainer width="100%" height={240}>
                                    <AreaChart data={metrics.trendStats || []}>
                                        <defs>
                                            <linearGradient id="visitGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                                                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                                        <Tooltip wrapperClassName="rounded-xl text-xs border-slate-200" />
                                        <Area type="monotone" dataKey="count" name="Visits" stroke="#4f46e5" strokeWidth={2.5} fill="url(#visitGradient)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                             <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-900 text-sm mb-4">Appointment Status Breakdown</h3>
                                {/* Recharts donut — live consultation status distribution */}
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={statusPieData}
                                            dataKey="value" nameKey="name" innerRadius={50} outerRadius={76} paddingAngle={4}
                                        >
                                            {statusPieData.map(entry => (
                                                <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                                            ))}
                                        </Pie>
                                        <Tooltip wrapperClassName="rounded-xl text-xs" />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Consultation type split pills */}
                                <div className="flex gap-2 mt-3">
                                    <span className="flex-1 text-center text-[11px] font-bold bg-indigo-50 text-indigo-700 rounded-xl py-2">
                                        In-Person · {metrics.consultationTypes?.['In-Person'] || 0}
                                    </span>
                                    <span className="flex-1 text-center text-[11px] font-bold bg-teal-50 text-teal-700 rounded-xl py-2">
                                        Video · {metrics.consultationTypes?.Video || 0}
                                    </span>
                                </div>
                                {/* Departmental doctor + appointment volume breakdown */}
                                <h4 className="font-bold text-slate-900 text-xs mt-5 mb-2">Department Load</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {metrics.departmentStats?.length ? metrics.departmentStats.map((dept, i) => (
                                        <div key={i} className="flex justify-between items-center text-[11px] p-2 rounded-xl bg-slate-50">
                                            <span className="font-semibold text-slate-800">{dept.department}</span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{dept.count} Doctors</span>
                                                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">{dept.appointments} Visits</span>
                                            </span>
                                        </div>
                                    )) : (
                                        <div className="text-[11px] text-slate-400 p-2">No department data available.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ──────── TAB 2: DOCTORS MANAGEMENT ──────── */}
                {activeTab === 'doctors' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <input
                                type="text"
                                placeholder="Search specialists by name or wing..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="text-xs p-2.5 rounded-2xl border border-slate-200 w-72"
                            />
                            <button
                                onClick={() => {
                                    setEditingDoctor(null);
                                    setDocName('');
                                    setDocEmail('');
                                    setDocDept('Cardiology');
                                    setDocQual('MBBS, MD');
                                    setDocAge(30);
                                    setDocDegree('MBBS, MD - Cardiology');
                                    setDocCollege('');
                                    setDocAwards('');
                                    setDocExp(10);
                                    setDocFee(1500);
                                    setDoctorModalOpen(true);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> Add Specialist
                            </button>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100">
                                    <tr>
                                        <th className="p-4">Doctor Name</th>
                                        <th className="p-4">Department</th>
                                        <th className="p-4">Degree</th>
                                        <th className="p-4">College</th>
                                        <th className="p-4">Age</th>
                                        <th className="p-4">Awards</th>
                                        <th className="p-4">Presence</th>
                                        <th className="p-4">Fee</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {doctors.length === 0 && (
                                        <tr><td colSpan={9} className="p-8 text-center text-slate-400">No specialists registered yet.</td></tr>
                                    )}
                                    {doctors
                                        .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.department.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(doc => (
                                            <tr key={doc._id} className="hover:bg-slate-50/50">
                                                <td className="p-4 font-bold text-slate-900">{doc.name}</td>
                                                <td className="p-4 text-indigo-700 font-semibold">{doc.department}</td>
                                                <td className="p-4 text-slate-600">{doc.degree || doc.qualification}</td>
                                                <td className="p-4 text-slate-500">{doc.college || 'PrimeCare Academy of Medicine'}</td>
                                                <td className="p-4 text-slate-500">{doc.age || '—'}</td>
                                                <td className="p-4 text-amber-700">{doc.awards?.length ? doc.awards[0] + (doc.awards.length > 1 ? ` +${doc.awards.length - 1}` : '') : '—'}</td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${doc.presenceStatus === 'available' ? 'bg-emerald-100 text-emerald-800' :
                                                            doc.presenceStatus === 'busy' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {doc.presenceStatus}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-bold text-slate-700">{doc.consultationFee} Rs</td>
                                                <td className="p-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingDoctor(doc);
                                                            setDocName(doc.name);
                                                            setDocEmail(doc.email);
                                                            setDocDept(doc.department);
                                                            setDocQual(doc.qualification);
                                                            setDocAge(doc.age || 30);
                                                            setDocDegree(doc.degree || doc.qualification || 'MBBS, MD');
                                                            setDocCollege(doc.college || '');
                                                            setDocAwards((doc.awards || []).join('\n'));
                                                            setDocExp(doc.experienceYears);
                                                            setDocFee(doc.consultationFee);
                                                            setDoctorModalOpen(true);
                                                        }}
                                                        className="text-slate-600 hover:text-indigo-600"
                                                    >
                                                        <Edit3 className="w-4 h-4 inline" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteDoctor(doc._id, doc.name)}
                                                        className="text-slate-400 hover:text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4 inline" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ──────── TAB 3: USER ROLES ──────── */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="p-4">User Name</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Current Role</th>
                                    <th className="p-4">Change Role</th>
                                    <th className="p-4 text-right">Account Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {usersList.length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">No registered users found.</td></tr>
                                )}
                                {usersList.map(u => {
                                    const isDesignatedAdmin = (u.email || '').toLowerCase() === 'primecare.hospital.admin@gmail.com';
                                    const isStaffProfile = u.isStaffProfile;
                                    return (
                                        <tr key={u._id} className="hover:bg-slate-50/50">
                                            <td className="p-4 font-bold text-slate-900">
                                                {u.name}
                                                {isStaffProfile && <span className="ml-2 text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">MEDICAL STAFF</span>}
                                            </td>
                                            <td className="p-4 text-slate-500 font-mono">{u.email}</td>
                                            <td className="p-4">
                                                <span className="font-bold uppercase text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {isStaffProfile ? (
                                                    <span className="text-[10px] text-slate-400 italic">No login account</span>
                                                ) : (
                                                    <select
                                                        value={u.role}
                                                        disabled={isDesignatedAdmin}
                                                        onChange={e => handleRoleChange(u._id, e.target.value)}
                                                        className="p-1 rounded-lg border border-slate-200 text-xs disabled:opacity-40"
                                                    >
                                                        <option value="patient">Patient</option>
                                                        <option value="doctor">Doctor</option>
                                                        <option value="hospital_admin">Hospital Admin</option>
                                                    </select>
                                                )}
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingUser(u);
                                                        setUserName(u.name);
                                                        setUserEmail(u.email);
                                                    }}
                                                    className="text-slate-600 hover:text-indigo-600"
                                                    title="Edit user details"
                                                >
                                                    <Edit3 className="w-4 h-4 inline" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(u._id, u.email)}
                                                    className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                                                    title="Delete user account & associated records"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ──────── TAB 4: APPOINTMENT MANAGEMENT ──────── */}
                {activeTab === 'appointments' && (
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        {/* Consultation Type Filter — In-Person vs Video differentiation */}
                        <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex flex-wrap gap-2 items-center">
                            {[
                                { id: 'All', label: 'All Bookings' },
                                { id: 'in-person', label: 'In-Person Consultations', icon: Stethoscope },
                                { id: 'video', label: 'Video Consultations', icon: Video }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setConsultTypeFilter(f.id)}
                                    className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                                        consultTypeFilter === f.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                                    }`}
                                >
                                    {f.icon && <f.icon className="w-3.5 h-3.5" />}
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="p-4">Token</th>
                                    <th className="p-4">Patient</th>
                                    <th className="p-4">Specialist</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Date & Slot</th>
                                    <th className="p-4 text-right">Override / Delete</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {appointments.filter(a => consultTypeFilter === 'All' || a.consultationType === consultTypeFilter).length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">No appointments match this filter.</td></tr>
                                )}
                                {appointments
                                    .filter(a => consultTypeFilter === 'All' || a.consultationType === consultTypeFilter)
                                    .map(appt => (
                                        <tr key={appt._id} className="hover:bg-slate-50/50">
                                            <td className="p-4 font-mono font-bold text-indigo-600">{appt.tokenNumber}</td>
                                            <td className="p-4 font-semibold text-slate-900">
                                                {appt.patientName}
                                                <span className="block text-[10px] text-slate-400 font-normal">{appt.patientEmail}</span>
                                            </td>
                                            <td className="p-4 text-slate-600">{appt.doctor?.name || 'Doctor'}</td>
                                            <td className="p-4">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${
                                                    appt.consultationType === 'video' ? 'bg-teal-100 text-teal-800' : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                    {appt.consultationType === 'video' ? <><Video className="w-3 h-3" /> Video</> : <>In-Person</>}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-500">{appt.date} • {appt.timeSlot}</td>
                                            <td className="p-4 text-right flex gap-1.5 justify-end items-center">
                                                {/* Details viewer (clinical reason, urgency, queue info) */}
                                                <button
                                                    onClick={() => setDetailAppt(appt)}
                                                    className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                                                    title="View appointment details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {/* Full 5-mode status override */}
                                                <select
                                                    value={appt.status}
                                                    onChange={e => handleAppointmentStatusOverride(appt._id, e.target.value)}
                                                    className={`p-1.5 rounded-lg border text-[10px] font-bold ${
                                                        appt.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        appt.status === 'in-progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        appt.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        appt.status === 'no-show' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                        'bg-red-50 text-red-700 border-red-200'
                                                    }`}
                                                >
                                                    <option value="scheduled">Scheduled</option>
                                                    <option value="in-progress">In-Consultation</option>
                                                    <option value="completed">Completed</option>
                                                    <option value="cancelled">Cancelled</option>
                                                    <option value="no-show">No-Show</option>
                                                </select>
                                                <button
                                                    onClick={() => handleDeleteAppointment(appt._id, appt.tokenNumber)}
                                                    className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                                                    title="Delete appointment permanently"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ──────── TAB 5: SECURITY AUDIT LOGS ──────── */}
                {activeTab === 'security' && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 text-sm">Real-Time Access & Security Audit Trail</h3>
                            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full">
                                {securityLogs.length} Events Logged
                            </span>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                            {securityLogs.length === 0 && (
                                <div className="py-8 text-center text-xs text-slate-400">No audit events recorded yet.</div>
                            )}
                            {securityLogs.map((log, i) => (
                                <div key={i} className="py-3 flex justify-between items-center text-xs">
                                    <div>
                                        <span className="font-mono font-bold text-indigo-700 mr-2">{log.event}</span>
                                        <span className="text-slate-700">{log.details}</span>
                                    </div>
                                    {/* Forensic stamp: exact wall-clock (to the second) + originating client IP */}
                                    <div className="text-right text-[11px] text-slate-400">
                                        <span className="block font-mono text-slate-600">{formatAuditStamp(log.createdAt)}</span>
                                        <span>IP: {log.ip}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Doctor Add/Edit Modal */}
            {doctorModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleSaveDoctor} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 text-base">{editingDoctor ? 'Edit Doctor' : 'Add New Specialist'}</h3>
                            <button type="button" onClick={() => setDoctorModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <input
                            type="text"
                            required
                            placeholder="Full Name (e.g. Dr. Aryan Sharma)"
                            value={docName}
                            onChange={e => setDocName(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        />
                        <input
                            type="email"
                            required
                            placeholder="Official Doctor Email"
                            value={docEmail}
                            onChange={e => setDocEmail(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        />
                        <select
                            value={docDept}
                            onChange={e => setDocDept(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        >
                            {['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Emergency & Trauma', 'Oncology', 'Dermatology', 'General Medicine'].map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            required
                            placeholder="Qualifications (e.g. MBBS, MD, DM)"
                            value={docQual}
                            onChange={e => setDocQual(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        />
                        <input
                            type="text"
                            required
                            placeholder="Clinical Degree (e.g. MBBS, MD - Cardiology, DM - Cardiology)"
                            value={docDegree}
                            onChange={e => setDocDegree(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        />
                        <input
                            type="text"
                            placeholder="Medical College (e.g. AIIMS New Delhi, CMC Vellore)"
                            value={docCollege}
                            onChange={e => setDocCollege(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        />
                        <textarea
                            rows={3}
                            placeholder="Awards & Recognitions (one per line)"
                            value={docAwards}
                            onChange={e => setDocAwards(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        />
                        <div className="grid grid-cols-3 gap-2">
                            <input
                                type="number"
                                min={24}
                                max={90}
                                placeholder="Age (Years)"
                                value={docAge}
                                onChange={e => setDocAge(e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                            />
                            <input
                                type="number"
                                placeholder="Experience (Years)"
                                value={docExp}
                                onChange={e => setDocExp(e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                            />
                            <input
                                type="number"
                                placeholder="Consultation Fee (Rs)"
                                value={docFee}
                                onChange={e => setDocFee(e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                            />
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 text-white font-bold text-xs py-3 rounded-2xl shadow-md">
                            {editingDoctor ? 'Update Medical Staff Profile' : 'Register Medical Staff'}
                        </button>
                    </form>
                </div>
            )}
            {/* User Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleSaveUserDetails} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 text-base">Edit Account Details</h3>
                            <button type="button" onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <input
                            type="text"
                            required
                            placeholder="Full Name"
                            value={userName}
                            onChange={e => setUserName(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        />
                        <input
                            type="email"
                            required
                            placeholder="Email Address"
                            value={userEmail}
                            onChange={e => setUserEmail(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        />
                        <button type="submit" className="w-full bg-indigo-600 text-white font-bold text-xs py-3 rounded-2xl shadow-md">
                            Save Account Changes
                        </button>
                    </form>
                </div>
            )}
            {/* Appointment Details Viewer (full clinical + queue context) */}
            {detailAppt && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 text-base">
                                Appointment <span className="font-mono text-indigo-600">{detailAppt.tokenNumber}</span>
                            </h3>
                            <button onClick={() => setDetailAppt(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            {[
                                ['Patient', detailAppt.patientName],
                                ['Patient Email', detailAppt.patientEmail],
                                ['Phone', detailAppt.patientPhone || '—'],
                                ['Department', detailAppt.department],
                                ['Specialist', detailAppt.doctor?.name || 'Doctor'],
                                ['Date & Slot', `${detailAppt.date} · ${detailAppt.timeSlot}`],
                                ['Queue / Token', `#${detailAppt.queueNumber} · ${detailAppt.tokenNumber}`],
                                ['Est. Wait', `~${detailAppt.estimatedWaitMinutes} min`],
                                ['Urgency', detailAppt.urgencyLevel],
                                ['Status', detailAppt.status]
                            ].map(([label, val]) => (
                                <div key={label} className="bg-slate-50 rounded-xl p-3">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">{label}</span>
                                    <span className="font-bold text-slate-800">{val}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 text-xs">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Reason for Visit</span>
                            <span className="text-slate-800">{detailAppt.reason || 'General Consultation'}</span>
                        </div>
                        {detailAppt.doctorNotes && (
                            <div className="bg-slate-50 rounded-xl p-3 text-xs">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Doctor Notes</span>
                                <span className="text-slate-800">{detailAppt.doctorNotes}</span>
                            </div>
                        )}
                        <button
                            onClick={() => setDetailAppt(null)}
                            className="w-full bg-slate-900 text-white font-bold text-xs py-3 rounded-2xl"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
