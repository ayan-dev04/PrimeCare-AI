import React, { useState } from 'react';
import API from '../api';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
    const [isSignup, setIsSignup] = useState(true);
    const [step, setStep] = useState(1); // 1: Details, 2: OTP Verification
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'patient', department: 'General Medicine' });
    const departments = [
        'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
        'Emergency & Trauma', 'General Medicine', 'Oncology',
        'Obstetrics & Gynecology', 'Radiology', 'Pulmonology',
        'Dermatology', 'Ophthalmology', 'ENT', 'Psychiatry', 'ICU'
    ];
    const [otp, setOtp] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const { data } = await API.post('/auth/register', formData);
            if (data.success) setStep(2);
        } catch (err) {
            alert(err.response?.data?.message || 'Registration failed');
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        try {
            const { data } = await API.post('/auth/verify-otp', { email: formData.email, otp });
            if (data.success) {
                localStorage.setItem('primecare_token', data.token);
                localStorage.setItem('primecare_user', JSON.stringify(data.user));
                if (data.user.role === 'patient') navigate('/patient-dashboard');
                else if (data.user.role === 'doctor') navigate('/doctor-dashboard');
                else navigate('/admin-dashboard');
            }
        } catch (err) {
            alert('Invalid or expired OTP');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <h2 className="text-2xl font-bold mb-1 text-slate-900">PrimeCare Portal</h2>
                <p className="text-sm text-slate-500 mb-6">AI-Powered Hospital Management System</p>

                {step === 1 ? (
                    <form onSubmit={handleRegister} className="space-y-4">
                        {isSignup && (
                            <input type="text" placeholder="Full Name" required className="w-full p-3 border rounded-xl text-sm"
                                value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        )}
                        <input type="email" placeholder="Gmail Address" required className="w-full p-3 border rounded-xl text-sm"
                            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                        <input type="password" placeholder="Password" required className="w-full p-3 border rounded-xl text-sm"
                            value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                        {isSignup && (
                            <select className="w-full p-3 border rounded-xl text-sm bg-white" value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                <option value="patient">Patient</option>
                                <option value="doctor">Doctor</option>
                                <option value="hospital_admin">Hospital Admin</option>
                            </select>
                        )}
                        {isSignup && formData.role === 'doctor' && (
                            <select className="w-full p-3 border rounded-xl text-sm bg-white" value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}>
                                {departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                            </select>
                        )}
                        <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-xl font-medium hover:bg-indigo-700 transition">
                            {isSignup ? 'Register & Send Gmail OTP' : 'Login'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                        <p className="text-sm text-indigo-600 font-medium">OTP sent to {formData.email}. Check your Gmail inbox.</p>
                        <input type="text" placeholder="Enter 6-digit OTP" required maxLength={6} className="w-full p-3 border rounded-xl text-center tracking-widest text-lg font-bold"
                            value={otp} onChange={(e) => setOtp(e.target.value)} />
                        <button type="submit" className="w-full bg-emerald-600 text-white p-3 rounded-xl font-medium hover:bg-emerald-700 transition">
                            Verify & Proceed
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}