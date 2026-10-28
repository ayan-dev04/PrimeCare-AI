import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/clerk-react';
import { Calendar, LayoutDashboard, UserCheck, Menu, X, ChevronDown, ShieldCheck } from 'lucide-react';
import RoleSelectionModal from './RoleSelectionModal';

export default function Navbar() {
    const { user } = useUser();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [departmentsDropdownOpen, setDepartmentsDropdownOpen] = useState(false);
    const [mobileDeptsOpen, setMobileDeptsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const role = user?.unsafeMetadata?.role || localStorage.getItem('primecare_user_role');
    const isActive = (path) => location.pathname === path;

    const departmentsList = [
        'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
        'Emergency & Trauma', 'Oncology', 'Dermatology', 'General Medicine'
    ];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDepartmentsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <RoleSelectionModal />

            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">

                    {/* Brand Logo & Name */}
                    <Link to="/" className="flex items-center gap-3.5 group py-2">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow-md border-2 border-indigo-100 flex items-center justify-center p-1.5 overflow-hidden shrink-0 group-hover:scale-105 transition duration-300">
                            <img
                                src="/logo.jpeg"
                                alt="PrimeCare Logo"
                                className="w-full h-full object-contain rounded-full"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">PrimeCare</span>
                            <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest">Hospital</span>
                        </div>

                    </Link>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden md:flex items-center gap-1 font-semibold text-sm">
                        <Link
                            to="/"
                            className={`px-4 py-2 rounded-xl transition ${isActive('/') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'}`}
                        >
                            Home
                        </Link>

                        <Link
                            to="/about"
                            className={`px-4 py-2 rounded-xl transition ${isActive('/about') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'}`}
                        >
                            About Us
                        </Link>

                        <Link
                            to="/doctors"
                            className={`px-4 py-2 rounded-xl transition ${isActive('/doctors') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'}`}
                        >
                            Specialists
                        </Link>

                        {/* Departments Dropdown (Click-to-Toggle with seamless bridge) */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDepartmentsDropdownOpen(!departmentsDropdownOpen)}
                                className={`px-4 py-2 rounded-xl transition flex items-center gap-1 ${location.pathname.includes('/departments') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'}`}
                            >
                                Departments <ChevronDown className={`h-4 w-4 transition-transform ${departmentsDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {departmentsDropdownOpen && (
                                <div className="absolute top-full left-0 pt-2 w-64 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 py-3">
                                        <div className="px-4 py-2 border-b border-slate-100 mb-1">
                                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">Centers of Excellence</span>
                                        </div>
                                        {departmentsList.map((dept) => (
                                            <Link
                                                key={dept}
                                                to={`/departments/${encodeURIComponent(dept)}`}
                                                onClick={() => setDepartmentsDropdownOpen(false)}
                                                className="block px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                                            >
                                                {dept}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Role-Based Navigation Links */}
                        <SignedIn>
                            {role === 'patient' && (
                                <>
                                    <Link
                                        to="/book-appointment"
                                        className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${isActive('/book-appointment') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'}`}
                                    >
                                        <Calendar className="h-4 w-4" /> Book Appointment
                                    </Link>
                                    <Link
                                        to="/patient-dashboard"
                                        className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${isActive('/patient-dashboard') ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                                    >
                                        <LayoutDashboard className="h-4 w-4" /> Patient Dashboard
                                    </Link>
                                </>
                            )}

                            {role === 'doctor' && (
                                <Link
                                    to="/doctor-dashboard"
                                    className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${isActive('/doctor-dashboard') ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                                >
                                    <UserCheck className="h-4 w-4" /> Doctor Dashboard
                                </Link>
                            )}

                            {(role === 'admin' || role === 'hospital_admin' || user?.primaryEmailAddress?.emailAddress?.toLowerCase() === 'primecare.hospital.admin@gmail.com') && (
                                <Link
                                    to="/admin-dashboard"
                                    className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${isActive('/admin-dashboard') ? 'bg-slate-900 text-white shadow-sm' : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'}`}
                                >
                                    <ShieldCheck className="h-4 w-4" /> Admin Portal
                                </Link>
                            )}
                        </SignedIn>
                    </nav>

                    {/* Auth Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="text-slate-700 hover:text-indigo-600 font-bold text-sm px-4 py-2.5 transition">
                                    Sign In
                                </button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-indigo-200 transition">
                                    Sign Up
                                </button>
                            </SignUpButton>
                        </SignedOut>

                        <SignedIn>
                            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
                                <UserButton afterSignOutUrl="/" />
                                <div className="flex flex-col text-left">
                                    <span className="text-xs font-bold text-slate-800 line-clamp-1">{user?.fullName || 'User'}</span>
                                    <span className="text-[10px] font-extrabold uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded tracking-wide w-fit">
                                        {role || 'Member'}
                                    </span>
                                </div>
                            </div>
                        </SignedIn>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-3">
                        <SignedIn>
                            <UserButton afterSignOutUrl="/" />
                        </SignedIn>
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>

                </div>

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-b border-slate-200 px-4 py-6 space-y-3 font-medium shadow-xl max-h-[80vh] overflow-y-auto">
                        <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700">Home</Link>
                        <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700">About Us</Link>
                        <Link to="/doctors" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700">Specialists</Link>

                        {/* Mobile Departments Accordion */}
                        <div>
                            <button
                                onClick={() => setMobileDeptsOpen(!mobileDeptsOpen)}
                                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold"
                            >
                                <span>Departments</span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${mobileDeptsOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {mobileDeptsOpen && (
                                <div className="pl-4 space-y-1 mt-1 border-l-2 border-indigo-100 ml-4">
                                    {departmentsList.map((dept) => (
                                        <Link
                                            key={dept}
                                            to={`/departments/${encodeURIComponent(dept)}`}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50"
                                        >
                                            {dept}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        <SignedIn>
                            {role === 'patient' && (
                                <>
                                    <Link to="/book-appointment" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-xl hover:bg-slate-50 text-indigo-600 font-bold">Book Appointment</Link>
                                    <Link to="/patient-dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-600 font-bold">Patient Dashboard</Link>
                                </>
                            )}
                            {role === 'doctor' && (
                                <Link to="/doctor-dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-600 font-bold">Doctor Dashboard</Link>
                            )}
                            {(role === 'admin' || role === 'hospital_admin' || user?.primaryEmailAddress?.emailAddress?.toLowerCase() === 'primecare.hospital.admin@gmail.com') && (
                                <Link to="/admin-dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold">Admin Portal</Link>
                            )}
                        </SignedIn>

                        <SignedOut>
                            <div className="pt-4 border-t border-slate-100 flex gap-3">
                                <SignInButton mode="modal">
                                    <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl text-sm transition">Sign In</button>
                                </SignInButton>
                                <SignUpButton mode="modal">
                                    <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-md">Sign Up</button>
                                </SignUpButton>
                            </div>
                        </SignedOut>
                    </div>
                )}
            </header>
        </>
    );
}