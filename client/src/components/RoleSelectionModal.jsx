import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { User, Stethoscope, ShieldCheck, Loader2 } from 'lucide-react';

export default function RoleSelectionModal() {
    const { user, isLoaded } = useUser();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [syncChecked, setSyncChecked] = useState(false);

    //  Universal Doctor Role-Mapping & RBAC Sync Hook
    // Whenever any user signs in or loads a session, query MongoDB to check if their email matches a doctor
    useEffect(() => {
        if (!isLoaded || !user || syncChecked) return;

        const syncUserRole = async () => {
            const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress;
            if (!userEmail) return;

            try {
                // Auto-detect designated hospital admin email
                const designatedAdminEmail = 'primecare.hospital.admin@gmail.com';
                if (userEmail.toLowerCase() === designatedAdminEmail.toLowerCase()) {
                    if (user.unsafeMetadata?.role !== 'admin') {
                        await user.update({ unsafeMetadata: { role: 'admin' } });
                    }
                    localStorage.setItem('primecare_user_role', 'admin');
                    setSyncChecked(true);
                    if (window.location.pathname === '/' || window.location.pathname === '/patient-dashboard') {
                        navigate('/admin-dashboard');
                    }
                    return;
                }

                // Call backend role-sync endpoint
                const { data } = await API.post('/auth/sync-role', { email: userEmail });

                if (data?.isDoctor) {
                    // Match found in MongoDB Doctor collection!
                    console.log(`[Role Sync] Doctor detected in Medical Staff records: ${userEmail}`);

                    // Automatically update Clerk unsafeMetadata & localStorage
                    if (user.unsafeMetadata?.role !== 'doctor' || user.unsafeMetadata?.doctorId !== data.doctor?.id) {
                        await user.update({
                            unsafeMetadata: {
                                role: 'doctor',
                                doctorId: data.doctor?.id,
                                department: data.doctor?.department
                            }
                        });
                    }

                    localStorage.setItem('primecare_user_role', 'doctor');
                    localStorage.setItem('primecare_user', JSON.stringify({
                        id: data.doctor?.id,
                        name: data.doctor?.name,
                        email: data.doctor?.email,
                        role: 'doctor',
                        department: data.doctor?.department
                    }));

                    setSyncChecked(true);

                    // Redirect doctors directly to Doctor Dashboard if currently on home or dashboard
                    if (window.location.pathname === '/' || window.location.pathname === '/patient-dashboard') {
                        navigate('/doctor-dashboard');
                    }
                } else {
                    setSyncChecked(true);
                }
            } catch (err) {
                console.error('[Role Sync Error]:', err);
                setSyncChecked(true);
            }
        };

        syncUserRole();
    }, [user, isLoaded, syncChecked, navigate]);

    if (!user) return null;

    // Check role from Clerk unsafeMetadata or localStorage fallback
    const currentRole = user.unsafeMetadata?.role || localStorage.getItem('primecare_user_role');
    if (currentRole) return null;

    const handleRoleSelect = async (role) => {
        try {
            setLoading(true);
            const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress;
            const userName = user.fullName || user.firstName || 'PrimeCare User';

            // Sync with MongoDB User Collection and verify Doctor credential if chosen
            const { data } = await API.post('/auth/sync-user', {
                name: userName,
                email: userEmail,
                role: role
            });

            // If user selected doctor, synchronize doctor metadata
            if (role === 'doctor') {
                await user.update({
                    unsafeMetadata: {
                        role: 'doctor',
                        doctorId: data?.doctor?.id,
                        department: data?.doctor?.department
                    }
                });

                localStorage.setItem('primecare_user_role', 'doctor');
                if (data?.doctor) {
                    localStorage.setItem('primecare_user', JSON.stringify({
                        id: data.doctor.id,
                        name: data.doctor.name,
                        email: data.doctor.email,
                        role: 'doctor',
                        department: data.doctor.department
                    }));
                }

                setLoading(false);
                navigate('/doctor-dashboard');
            } else if (role === 'admin') {
                // Admin role selected
                await user.update({
                    unsafeMetadata: { role: 'admin' }
                });
                localStorage.setItem('primecare_user_role', 'admin');
                setLoading(false);
                navigate('/admin-dashboard');
            } else {
                // Patient role selected
                await user.update({
                    unsafeMetadata: { role: 'patient' }
                });
                localStorage.setItem('primecare_user_role', 'patient');
                setLoading(false);
                navigate('/patient-dashboard');
            }
        } catch (err) {
            console.error('Failed to update role:', err);
            const errorMsg = err.response?.data?.message || 'Failed to assign role. Please try again.';
            alert(errorMsg);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 text-center relative overflow-hidden animate-in fade-in zoom-in duration-300">

                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <ShieldCheck className="h-8 w-8" />
                </div>

                <h2 className="text-2xl font-black text-slate-900 mb-2">Select Your Portal Role</h2>
                <p className="text-slate-500 text-sm mb-8">
                    Please specify whether you are registering as a Patient or Hospital Doctor to configure your credentials and dashboard.
                </p>

                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                        <p className="text-xs font-bold text-slate-600">Verifying credentials & storing profile in database...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                            onClick={() => handleRoleSelect('patient')}
                            className="p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50 transition flex flex-col items-center group text-center"
                        >
                            <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                                <User className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-slate-900 text-sm mb-0.5">Patient</span>
                            <span className="text-[11px] text-slate-500 leading-tight">Appointments & Queue Status</span>
                        </button>

                        <button
                            onClick={() => handleRoleSelect('doctor')}
                            className="p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50 transition flex flex-col items-center group text-center"
                        >
                            <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                                <Stethoscope className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-slate-900 text-sm mb-0.5">Doctor</span>
                            <span className="text-[11px] text-slate-500 leading-tight">OPD Queue & Consultations</span>
                        </button>

                        <button
                            onClick={() => handleRoleSelect('admin')}
                            className="p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50 transition flex flex-col items-center group text-center"
                        >
                            <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-slate-900 text-sm mb-0.5">Admin</span>
                            <span className="text-[11px] text-slate-500 leading-tight">Hospital Administration & Audit</span>
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
