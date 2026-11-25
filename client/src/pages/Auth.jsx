import React, { useState } from 'react';
import API from '../api';
import { useNavigate } from 'react-router-dom';
import { User, Stethoscope, ArrowLeft, Mail, Lock, Building, CheckCircle2 } from 'lucide-react';

export default function Auth() {
    const [isSignup, setIsSignup] = useState(true);
    const [selectedRole, setSelectedRole] = useState(null); // 'patient' | 'doctor'
    const [step, setStep] = useState(1); // 1: Role or Form, 2: OTP Verification
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'patient',
        department: 'General Medicine'
    });

    const departments = [
        'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
        'Emergency & Trauma', 'General Medicine', 'Oncology',
        'Obstetrics & Gynecology', 'Radiology', 'Pulmonology',
        'Dermatology', 'Ophthalmology', 'ENT', 'Psychiatry', 'ICU'
    ];

    const [otp, setOtp] = useState('');
    const navigate = useNavigate();

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
        setFormData(prev => ({ ...prev, role }));
        setErrorMsg('');
        setStatusMsg('');
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setStatusMsg('');
        setLoading(true);

        try {
            const { data } = await API.post('/auth/register', formData);
            if (data.success) {
                setStatusMsg(data.message || 'OTP sent successfully to your Gmail.');
                setStep(2);
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setStatusMsg('');
        setLoading(true);

        try {
            const { data } = await API.post('/auth/login', {
                email: formData.email,
                password: formData.password
            });

            if (data.success) {
                localStorage.setItem('primecare_token', data.token);
                localStorage.setItem('primecare_user', JSON.stringify(data.user));
                localStorage.setItem('primecare_user_role', data.user.role);
                window.dispatchEvent(new Event('primecare_auth_change'));

                if (data.user.role === 'patient') navigate('/patient-dashboard');
                else if (data.user.role === 'doctor') navigate('/doctor-dashboard');
                else navigate('/admin-dashboard');
            }
        } catch (err) {
            if (!err.response) {
                // Network error, DNS resolution failure, connection reset, or timeout
                if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                    setErrorMsg('Server took too long to respond. The backend may be waking up from sleep. Please try again.');
                } else {
                    setErrorMsg('Unable to connect to PrimeCare server. The service might be starting up. Please check your internet connection and try again.');
                }
            } else if (err.response.status >= 500) {
                setErrorMsg('Server error encountered while processing your login. Please try again shortly.');
            } else if (err.response.status === 429) {
                setErrorMsg('Too many login attempts. Please wait a minute before trying again.');
            } else {
                setErrorMsg(err.response?.data?.message || 'Invalid email or password.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setStatusMsg('');
        setLoading(true);

        try {
            const { data } = await API.post('/auth/verify-otp', { email: formData.email, otp });
            if (data.success) {
                localStorage.setItem('primecare_token', data.token);
                localStorage.setItem('primecare_user', JSON.stringify(data.user));
                localStorage.setItem('primecare_user_role', data.user.role);
                window.dispatchEvent(new Event('primecare_auth_change'));

                if (data.user.role === 'patient') navigate('/patient-dashboard');
                else if (data.user.role === 'doctor') navigate('/doctor-dashboard');
                else navigate('/admin-dashboard');
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Invalid or expired OTP. Please check and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        setErrorMsg('');
        setStatusMsg('Resending OTP to your Gmail...');
        try {
            const { data } = await API.post('/auth/register', formData);
            if (data.success) {
                setStatusMsg('New OTP sent to your Gmail inbox.');
            }
        } catch (err) {
            setErrorMsg('Failed to resend OTP. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-black text-slate-900">PrimeCare Portal</h2>
                    <p className="text-sm text-slate-500 mt-1">AI-Powered Hospital Management System</p>
                </div>

                {/* Tab Switcher: Sign Up vs Login */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    <button
                        type="button"
                        onClick={() => { setIsSignup(true); setStep(1); setSelectedRole(null); setErrorMsg(''); setStatusMsg(''); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${isSignup ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Sign Up
                    </button>
                    <button
                        type="button"
                        onClick={() => { setIsSignup(false); setStep(1); setErrorMsg(''); setStatusMsg(''); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${!isSignup ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Login
                    </button>
                </div>

                {/* Alert Messages */}
                {errorMsg && (
                    <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                        {errorMsg}
                    </div>
                )}
                {statusMsg && (
                    <div className="p-3 mb-4 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{statusMsg}</span>
                    </div>
                )}

                {/* Login Form */}
                {!isSignup && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Gmail / Email Address</label>
                            <input
                                type="email"
                                placeholder="name@gmail.com"
                                required
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                            <input
                                type="password"
                                placeholder="Enter your password"
                                required
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold text-sm transition shadow-md shadow-indigo-200 disabled:opacity-50"
                        >
                            {loading ? 'Logging in...' : 'Sign In to Portal'}
                        </button>
                    </form>
                )}

                {/* Sign Up Step 1: Explicit Role Choice (Patient or Doctor) */}
                {isSignup && step === 1 && !selectedRole && (
                    <div className="space-y-4">
                        <p className="text-xs font-bold text-slate-600 text-center uppercase tracking-wider mb-2">
                            Select Registration Option:
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleRoleSelect('patient')}
                                className="p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50 transition flex flex-col items-center group text-center"
                            >
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                                    <User className="h-6 w-6" />
                                </div>
                                <span className="font-bold text-slate-900 text-sm">Sign up as Patient</span>
                                <span className="text-[11px] text-slate-500 mt-1">Book appointments & access lab reports</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleRoleSelect('doctor')}
                                className="p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50 transition flex flex-col items-center group text-center"
                            >
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                                    <Stethoscope className="h-6 w-6" />
                                </div>
                                <span className="font-bold text-slate-900 text-sm">Sign up as Doctor</span>
                                <span className="text-[11px] text-slate-500 mt-1">Manage OPD queue & patient records</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Sign Up Step 1: Registration Form for Chosen Role */}
                {isSignup && step === 1 && selectedRole && (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-xs font-bold text-indigo-600 uppercase">
                                Registering as {selectedRole === 'doctor' ? 'Medical Doctor' : 'Hospital Patient'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedRole(null)}
                                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 font-semibold"
                            >
                                <ArrowLeft className="h-3 w-3" /> Change
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                placeholder={selectedRole === 'doctor' ? 'Dr. John Doe' : 'Jane Doe'}
                                required
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Gmail Address (for OTP verification)</label>
                            <input
                                type="email"
                                placeholder="name@gmail.com"
                                required
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                            <input
                                type="password"
                                placeholder="Create a strong password"
                                required
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        {selectedRole === 'doctor' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                                <select
                                    className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                >
                                    {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                                </select>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold text-sm transition shadow-md shadow-indigo-200 disabled:opacity-50"
                        >
                            {loading ? 'Sending Verification OTP...' : 'Register & Send Gmail OTP'}
                        </button>
                    </form>
                )}

                {/* Sign Up Step 2: OTP Verification Form */}
                {isSignup && step === 2 && (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-center">
                            <Mail className="h-6 w-6 text-indigo-600 mx-auto mb-1" />
                            <p className="text-xs font-bold text-indigo-900">OTP Sent to Gmail</p>
                            <p className="text-[11px] text-slate-600 mt-0.5">{formData.email}</p>
                            <p className="text-[10px] text-slate-400 mt-1">Valid for 10 minutes</p>
                        </div>

                        <div>
                            <input
                                type="text"
                                placeholder="Enter 6-digit OTP"
                                required
                                maxLength={6}
                                className="w-full p-3 border border-slate-200 rounded-xl text-center tracking-widest text-xl font-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl font-bold text-sm transition shadow-md shadow-emerald-200 disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Verify OTP & Complete Setup'}
                        </button>

                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={handleResendOTP}
                                className="text-xs text-indigo-600 hover:underline font-semibold"
                            >
                                Didn't receive OTP? Resend
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
