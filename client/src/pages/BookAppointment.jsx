import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { Calendar, Clock, Stethoscope, CheckCircle2, ArrowRight, ShieldCheck, User, Video, Sparkles, AlertCircle } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

// Date inputs are local calendar days; toISOString() alone can return yesterday
// for positive UTC offsets, so subtract the timezone offset before formatting.
const toLocalDateString = (date = new Date()) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];

export default function Appointment() {
    const { user } = useUser();
    const navigate = useNavigate();

    const [departments] = useState([
        'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
        'Emergency & Trauma', 'Oncology', 'Dermatology', 'General Medicine'
    ]);

    const [selectedDept, setSelectedDept] = useState('Cardiology');
    const [selectedDate, setSelectedDate] = useState(toLocalDateString());
    const [selectedSlot, setSelectedSlot] = useState('');
    const [consultationType, setConsultationType] = useState('in-person'); // 'in-person' | 'video'
    const [patientReason, setPatientReason] = useState('');
    const [patientPhone, setPatientPhone] = useState('');

    const [recommendations, setRecommendations] = useState([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [availabilityData, setAvailabilityData] = useState(null);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotRefreshKey, setSlotRefreshKey] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [successAppointment, setSuccessAppointment] = useState(null);
    const [errorBanner, setErrorBanner] = useState('');

    // Fetch Smart Doctor Recommendations when department or date changes
    useEffect(() => {
        fetchRecommendations();
    }, [selectedDept, selectedDate]);

    const fetchRecommendations = async () => {
        try {
            setLoadingRecs(true);
            setErrorBanner('');
            const { data } = await API.get('/appointments/recommendations', {
                params: { department: selectedDept, date: selectedDate }
            });
            const recs = data.recommendations || [];
            setRecommendations(recs);
            if (recs.length > 0) {
                setSelectedDoctorId(recs[0].doctor._id);
            } else {
                setSelectedDoctorId('');
            }
        } catch (err) {
            console.error('Failed to load recommendations:', err);
        } finally {
            setLoadingRecs(false);
        }
    };

    // Pull the doctor's shift for the chosen weekday and rebuild the live slot grid.
    // The `active` flag prevents a slow response from overwriting a newer selection.
    useEffect(() => {
        if (!selectedDoctorId) {
            setAvailabilityData(null);
            setSelectedSlot('');
            return;
        }

        let active = true;
        const loadSlots = async () => {
            setLoadingSlots(true);
            setSelectedSlot('');
            setAvailabilityData(null);
            try {
                const { data } = await API.get(`/appointments/availability/${selectedDoctorId}`, {
                    params: { date: selectedDate }
                });
                if (!active) return;
                setAvailabilityData(data);
                const firstAvailable = data.slots?.find(s => s.available);
                setSelectedSlot(firstAvailable ? firstAvailable.slot : '');
            } catch (err) {
                if (!active) return;
                console.error('Failed to load slots:', err);
                setErrorBanner(err.response?.data?.error || 'Unable to load the doctor schedule.');
            } finally {
                if (active) setLoadingSlots(false);
            }
        };

        loadSlots();
        return () => { active = false; };
    }, [selectedDoctorId, selectedDate, slotRefreshKey]);

    const handleBooking = async (e) => {
        e.preventDefault();
        setErrorBanner('');

        if (!selectedDoctorId || !selectedDate || !selectedSlot) {
            setErrorBanner('Please select doctor, date, and an available time slot.');
            return;
        }

        const patientEmail = user?.primaryEmailAddress?.emailAddress || 'patient@primecarehospital.tech';
        const patientName = user?.fullName || 'Patient';
        const patientId = user?.id || patientEmail;

        try {
            setSubmitting(true);
            const { data } = await API.post('/appointments/book', {
                patientId,
                patientName,
                patientEmail,
                patientPhone,
                doctorId: selectedDoctorId,
                date: selectedDate,
                timeSlot: selectedSlot,
                department: selectedDept,
                reason: patientReason || 'General Medical Consultation',
                consultationType
            });

            setSuccessAppointment(data.appointment);
        } catch (err) {
            // Handle double-booking race conditions cleanly
            const msg = err.response?.data?.error || 'Booking failed. Please try again.';
            setErrorBanner(msg);
            setSlotRefreshKey(key => key + 1); // Refresh slots after a rejected booking
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block mb-3">
                        Smart Hospital Consultation Engine
                    </span>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Book Your Doctor & Live Queue Token
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-2">
                        Real-time presence checking, smart specialist recommendations, and double-booking collision prevention.
                    </p>
                </div>

                {errorBanner && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-semibold">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{errorBanner}</span>
                    </div>
                )}

                {/* Booking Success Confirmation View */}
                {successAppointment ? (
                    <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-2xl text-center max-w-xl mx-auto space-y-6">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Consultation Confirmed!</h2>
                            <p className="text-xs text-slate-500 mt-1">Your appointment has been registered in the hospital database.</p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-3 text-xs text-left">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500">Priority Token:</span>
                                <span className="font-mono font-black text-indigo-700 text-base">{successAppointment.tokenNumber}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500">Queue Position:</span>
                                <span className="font-bold text-slate-900">#{successAppointment.queueNumber}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500">Estimated Waiting Time:</span>
                                <span className="font-bold text-emerald-600">~{successAppointment.estimatedWaitMinutes} mins</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500">Scheduled Window:</span>
                                <span className="font-bold text-slate-900">{successAppointment.date} at {successAppointment.timeSlot}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Consultation Format:</span>
                                <span className="font-bold uppercase text-indigo-600">{successAppointment.consultationType}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate('/patient-dashboard')}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-2xl text-xs transition"
                            >
                                Go to Patient Dashboard
                            </button>
                            <button
                                onClick={() => {
                                    setSuccessAppointment(null);
                                    fetchRecommendations();
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 rounded-2xl text-xs"
                            >
                                Book Another
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Booking Form */
                    <form onSubmit={handleBooking} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left: Department & Smart Doctor Recommendations (7 cols) */}
                        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                            {/* Department Selector */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                                    1. Choose Medical Wing
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {departments.map(dept => (
                                        <button
                                            type="button"
                                            key={dept}
                                            onClick={() => setSelectedDept(dept)}
                                            className={`p-2.5 rounded-xl text-xs font-bold text-left transition border ${selectedDept === dept
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                }`}
                                        >
                                            {dept}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Smart Recommended Doctors */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> 2. Smart Doctor Selection
                                    </label>
                                    <span className="text-[10px] text-slate-400">Ranked by experience & shortest OPD wait</span>
                                </div>

                                {loadingRecs ? (
                                    <div className="p-8 text-center text-xs text-slate-500">Calculating doctor availability...</div>
                                ) : recommendations.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                                        No specialists available in this wing for selected date.
                                    </div>
                                ) : (
                                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                        {recommendations.map(rec => {
                                            const doc = rec.doctor;
                                            const isSelected = selectedDoctorId === doc._id;
                                            return (
                                                <div
                                                    key={doc._id}
                                                    onClick={() => setSelectedDoctorId(doc._id)}
                                                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${isSelected
                                                            ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                                                            : 'border-slate-100 bg-slate-50/60 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                                                            {doc.name.slice(4, 6).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-slate-900 text-xs">{doc.name}</h4>
                                                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.2 rounded-full">
                                                                    {doc.rating || 4.9} Rating
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-500">{doc.degree || doc.qualification} · {doc.consultationFee} Rs</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] text-slate-400 block">Queue Load</span>
                                                        <span className="text-xs font-bold text-indigo-700">{rec.activeQueue} waiting (~{rec.estimatedWaitMinutes}m)</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Date, Time Slots & Booking Details (5 cols) */}
                        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between">
                            <div className="space-y-4">
                                {/* Consultation Format */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                                        3. Consultation Format
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setConsultationType('in-person')}
                                            className={`p-2.5 rounded-xl text-xs font-bold border transition text-center ${consultationType === 'in-person'
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                                }`}
                                        >
                                            In-Person OPD
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConsultationType('video')}
                                            className={`p-2.5 rounded-xl text-xs font-bold border transition text-center flex items-center justify-center gap-1.5 ${consultationType === 'video'
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                                }`}
                                        >
                                            <Video className="w-3.5 h-3.5" /> Virtual Video
                                        </button>
                                    </div>
                                </div>

                                {/* Date Selection */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                                        4. Preferred Date
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        min={toLocalDateString()}
                                        value={selectedDate}
                                        onChange={e => setSelectedDate(e.target.value)}
                                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>

                                {/* Dynamic Slots */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                                        5. Live Available Slots
                                    </label>
                                    {availabilityData?.workingHours && (
                                        <p className="text-[11px] text-slate-500 mb-2">
                                            {availabilityData.day} OPD: {availabilityData.workingHours.start} to {availabilityData.workingHours.end}
                                            ({availabilityData.slotDurationMinutes}-minute slots)
                                        </p>
                                    )}
                                    {/* Surfaces the precise backend cancellation reason (checked out / busy / on break) */}
                                    {availabilityData?.bookingBlockedReason && (
                                        <div className="flex items-start gap-2 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl p-2.5 mb-2">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            {availabilityData.bookingBlockedReason}
                                        </div>
                                    )}
                                    {loadingSlots ? (
                                        <div className="p-4 text-center text-xs text-slate-400">Loading doctor schedule...</div>
                                    ) : !availabilityData?.slots || availabilityData.slots.length === 0 ? (
                                        <div className="text-xs text-slate-400">
                                            {availabilityData ? 'No bookable slots for this date.' : 'Please choose a doctor first.'}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
                                            {availabilityData.slots.map(s => (
                                                <button
                                                    type="button"
                                                    key={s.slot}
                                                    disabled={!s.available}
                                                    onClick={() => setSelectedSlot(s.slot)}
                                                    className={`py-1.5 px-1 rounded-lg text-[11px] font-bold border transition ${!s.available
                                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                                                            : selectedSlot === s.slot
                                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    {s.slot}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Patient Complaint */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                                        6. Symptoms / Chief Complaint
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={patientReason}
                                        onChange={e => setPatientReason(e.target.value)}
                                        placeholder="Describe symptoms for AI priority triage..."
                                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none resize-none"
                                    />
                                </div>
                            </div>

                        <button
                            type="submit"
                            disabled={submitting || !selectedSlot || availabilityData?.canBook === false}
                            className={`w-full font-black py-3.5 rounded-2xl text-xs sm:text-sm shadow-xl shadow-indigo-900/20 transition flex items-center justify-center gap-2 mt-4 ${submitting || !selectedSlot || availabilityData?.canBook === false
                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                        >
                            {availabilityData?.canBook === false ? 'Booking Disabled — Doctor Unavailable' : submitting ? 'Confirming with Medical Staff...' : 'Confirm Appointment & Generate Token'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}