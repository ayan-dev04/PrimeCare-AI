import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import API from '../api';

const ADMIN_EMAIL = 'primecare.hospital.admin@gmail.com';

const normalizeRole = (role) => (role === 'hospital_admin' ? 'admin' : role);

// Blocks direct URL access to dashboards that do not belong to the signed-in role.
export default function ProtectedRoute({ allow, children }) {
    const { user, isLoaded } = useUser();
    const [profile, setProfile] = useState(null);
    const [checking, setChecking] = useState(true);

    const storedUser = (() => {
        try {
            return JSON.parse(localStorage.getItem('primecare_user') || 'null');
        } catch {
            return null;
        }
    })();

    const email = user?.primaryEmailAddress?.emailAddress || storedUser?.email || '';

    useEffect(() => {
        if (!isLoaded) return;
        if (!user && !storedUser) {
            setChecking(false);
            return;
        }

        let active = true;
        const reqHeaders = email ? { headers: { 'x-user-email': email } } : {};
        API.get('/auth/me', reqHeaders)
            .then(res => { if (active) setProfile(res.data?.profile || null); })
            .catch(() => { if (active) setProfile(null); })
            .finally(() => { if (active) setChecking(false); });

        return () => { active = false; };
    }, [isLoaded, user?.id, storedUser?.email]);

    if (!isLoaded || checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm font-bold text-slate-500">
                Verifying account access...
            </div>
        );
    }

    if (!user && !storedUser) return <Navigate to="/auth" replace />;

    const role = normalizeRole(
        profile?.role ||
        user?.unsafeMetadata?.role ||
        storedUser?.role ||
        (email.toLowerCase() === ADMIN_EMAIL ? 'admin' : localStorage.getItem('primecare_user_role'))
    );

    const allowed = allow.map(normalizeRole);
    if (allowed.includes(role)) return children;

    const destination =
        role === 'doctor' ? '/doctor-dashboard' :
        role === 'patient' ? '/patient-dashboard' :
        role === 'admin' ? '/admin-dashboard' : '/';

    return <Navigate to={destination} replace />;
}
