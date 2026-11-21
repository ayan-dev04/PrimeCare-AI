import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { Stethoscope, Star, Award, Clock, IndianRupee, Search, Filter, Calendar, X, ChevronDown } from 'lucide-react';

export default function Doctors() {
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDept, setSelectedDept] = useState('All');
    const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const dropdownRef = useRef(null);

    const departments = [
        'All', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
        'Emergency & Trauma', 'Oncology', 'Dermatology', 'General Medicine'
    ];

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                setLoading(true);
            const response = await API.get('/doctors');
            // Medical Staff API may return a raw array or a { success, doctors } wrapper
            const data = Array.isArray(response.data) ? response.data : response.data?.doctors || [];
                if (data.length > 0) {
                    setDoctors(data);
                } else {
                    console.warn('[Doctors.jsx] API returned 0 doctors — check backend /api/doctors and MongoDB.');
                }
            } catch (err) {
                console.error("Failed to fetch doctors:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDoctors();
    }, []);

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setFilterDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helper function to generate initials badge
    const getInitials = (name) => {
        if (!name) return 'DR';
        const cleanName = name.replace(/Dr\./g, '').replace(/\(HOD\)/g, '').trim();
        const parts = cleanName.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return cleanName.substring(0, 2).toUpperCase();
    };

    // Filter doctors by search query and department
    const filteredDoctors = doctors.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.qualification?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDept === 'All' || (doc.department && doc.department.trim().toLowerCase() === selectedDept.trim().toLowerCase());
        return matchesSearch && matchesDept;
    });

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-16">

            {/* Header Banner */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 shadow-lg">
                <div className="max-w-7xl mx-auto text-center">
                    <span className="bg-indigo-500/30 text-indigo-200 text-xs font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-widest border border-indigo-400/30 inline-block mb-3">
                        PrimeCare Medical Staff
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">Our Expert Specialists</h1>
                    <p className="max-w-2xl mx-auto text-slate-300 text-sm sm:text-base leading-relaxed">
                        Meet our distinguished team of senior consultants, HODs, and medical specialists dedicated to world-class healthcare.
                    </p>
                </div>
            </div>

            {/* Search & Corner Filter Bar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80 flex flex-col sm:flex-row gap-4 items-center justify-between">

                    {/* Search Input */}
                    <div className="relative w-full sm:w-[60%]">
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by doctor name or specialty..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                        />
                    </div>

                    {/* Corner Filter Button & Dropdown Slider */}
                    <div className="relative w-full sm:w-auto flex justify-end" ref={dropdownRef}>
                        <button
                            onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                            className="w-full sm:w-auto px-5 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 border border-indigo-100 transition"
                        >
                            <Filter className="h-4 w-4" />
                            <span>Department: {selectedDept}</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${filterDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {filterDropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-4 py-2 border-b border-slate-100 mb-1">
                                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">Filter By Department</span>
                                </div>
                                {departments.map((dept) => (
                                    <button
                                        key={dept}
                                        onClick={() => {
                                            setSelectedDept(dept);
                                            setFilterDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-5 py-2.5 text-xs font-bold transition ${selectedDept === dept
                                                ? 'bg-indigo-50 text-indigo-600'
                                                : 'text-slate-700 hover:bg-slate-50 hover:text-indigo-600'
                                            }`}
                                    >
                                        {dept}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Doctors Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-slate-900">
                        {selectedDept === 'All' ? 'All Specialists' : selectedDept} ({filteredDoctors.length})
                    </h2>
                </div>

                {loading ? (
                    <div className="py-24 text-center">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500 font-medium text-sm">Loading hospital specialists...</p>
                    </div>
                ) : filteredDoctors.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                        <Stethoscope className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-800 mb-1">No Doctors Found</h3>
                        <p className="text-slate-500 text-sm">Try searching with a different keyword or department filter.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDoctors.map((doc) => (
                            <div
                                key={doc._id}
                                onClick={() => setSelectedDoctor(doc)}
                                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex justify-center mb-4">
                                        <div className="w-20 h-20 rounded-2xl bg-indigo-50 text-indigo-700 font-black text-xl flex items-center justify-center border-2 border-indigo-100 shadow-sm group-hover:scale-105 transition shrink-0">
                                            {getInitials(doc.name)}
                                        </div>
                                    </div>
                                    <div className="text-center mb-4">
                                        <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition">{doc.name}</h3>
                                        <p className="text-xs font-bold text-slate-600 line-clamp-1 mt-0.5">{doc.degree || doc.qualification || 'MBBS, MD - Senior Consultant'}</p>
                                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{doc.college}</p>
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full mt-2 border border-indigo-100">
                                            {doc.department || 'General Medicine'}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold mt-2 ml-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {doc.presenceStatus || 'Available'}
                                        </span>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-600">
                                    <span>Exp: <strong>{doc.experienceYears || '10'} Yrs</strong></span>
                                        <span className="font-extrabold text-indigo-600">{doc.consultationFee || '1000'} Rs</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Doctor Detailed Profile Modal */}
            {selectedDoctor && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setSelectedDoctor(null)}
                            className="absolute top-6 right-6 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-20 h-20 rounded-2xl bg-indigo-50 text-indigo-700 font-black text-2xl flex items-center justify-center border-2 border-indigo-100 shadow-md shrink-0">
                                {getInitials(selectedDoctor.name)}
                            </div>
                            <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                                    {selectedDoctor.department}
                                </span>
                                <h2 className="text-xl font-black text-slate-900 mt-1">{selectedDoctor.name}</h2>
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 mt-1">
                                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> {selectedDoctor.rating || '4.9'} / 5.0 Rating
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-xs text-slate-700 mb-6">
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                <span className="font-semibold text-slate-500">Medical Degree</span>
                                <span className="font-bold text-slate-900 text-right">{selectedDoctor.degree || selectedDoctor.qualification || 'MBBS, MD - Senior Consultant'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                <span className="font-semibold text-slate-500">Alma Mater</span>
                                <span className="font-bold text-slate-900 text-right">{selectedDoctor.college || 'PrimeCare Academy of Medicine'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                <span className="font-semibold text-slate-500">Age</span>
                                <span className="font-bold text-slate-900">{selectedDoctor.age ? `${selectedDoctor.age} Years` : 'Not Disclosed'}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                <span className="font-semibold text-slate-500">Clinical Experience</span>
                                <span className="font-bold text-slate-900">{selectedDoctor.experienceYears || '10+'} Years Practice</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                <span className="font-semibold text-slate-500">Awards & Recognitions</span>
                                <span className="font-bold text-amber-700 text-right">
                                    {selectedDoctor.awards?.length ? selectedDoctor.awards.join('; ') : 'Hospital Merit Recognition'}
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-200/60">
                                <span className="font-semibold text-slate-500">Consultation Fee</span>
                                        <span className="font-bold text-emerald-600">{selectedDoctor.consultationFee || '1000'} Rs</span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="font-semibold text-slate-500">Current Status</span>
                                <span className="font-bold text-emerald-600 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> {selectedDoctor.presenceStatus || 'Available'}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setSelectedDoctor(null)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedDoctor(null);
                                    navigate('/book-appointment');
                                }}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs transition shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
                            >
                                <Calendar className="h-4 w-4" /> Book Appointment
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}