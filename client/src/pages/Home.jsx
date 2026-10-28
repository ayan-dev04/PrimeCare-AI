import React from 'react';
import { SignUpButton, SignedIn, SignedOut } from '@clerk/clerk-react';
import { Shield, Clock, Brain, ArrowRight, Stethoscope, FileText, Calendar, MapPin, Phone, Mail, Globe, ExternalLink } from 'lucide-react';

export default function Home() {
    const departments = [
        'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
        'Emergency & Trauma', 'Oncology', 'Dermatology', 'General Medicine'
    ];

    const capabilities = [
        {
            icon: Clock,
            title: 'Smart Token Queue Allocation',
            description: 'Automated live queue generation and waiting time tracking synchronized with real-time doctor presence switches.'
        },
        {
            icon: Brain,
            title: 'AI Medical Assistant Triage',
            description: 'Advanced Gemini AI-powered symptom analysis, preliminary health report breakdown, and clinical summarization.'
        },
        {
            icon: FileText,
            title: 'Secure Electronic Health Records',
            description: 'Centralized, encrypted digital patient histories, prescription management, and downloadable PDF summaries.'
        },
        {
            icon: Calendar,
            title: 'Instant Appointment Scheduling',
            description: 'Frictionless booking with top-tier specialists across hospital departments and automated email dispatches.'
        }
    ];

    const steps = [
        { step: '01', title: 'Choose Department & Specialist', desc: 'Browse our verified senior consultants and review their clinical background and availability.' },
        { step: '02', title: 'Book & Get Queue Token', desc: 'Select your preferred date and time slot to instantly receive your priority hospital queue token.' },
        { step: '03', title: 'Consult & Receive Records', desc: 'Meet your specialist on-site or online and access your encrypted digital health records instantly.' }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-indigo-500 selection:text-white">

            {/* Hero Section: Split-Screen Layout with 100% Fully Visible Doctor Image */}
            <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white py-16 lg:py-24 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                        {/* Left Content */}
                        <div className="lg:col-span-7 z-10">
                            <span className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
                                <Shield className="h-4 w-4 text-indigo-400" /> Enterprise Health-Tech Standard
                            </span>

                            <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 leading-tight">
                                Next-Gen AI Hospital & <br />
                                <span className="text-indigo-400">
                                    Smart Queue Management
                                </span>
                            </h1>

                            <p className="text-slate-300 text-base sm:text-lg mb-10 leading-relaxed max-w-xl">
                                Streamlining hospital administration with automated token allocation, real-time doctor presence tracking, and verified clinical specialists across various departments.
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <SignedOut>
                                    <SignUpButton mode="modal">
                                        <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-indigo-900/40 transition flex items-center gap-2 transform hover:-translate-y-0.5">
                                            Access Portal <ArrowRight className="h-5 w-5" />
                                        </button>
                                    </SignUpButton>
                                </SignedOut>

                                <SignedIn>
                                    <a href="/patient-dashboard" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-indigo-900/40 transition flex items-center gap-2 transform hover:-translate-y-0.5">
                                        Open Patient Dashboard <ArrowRight className="h-5 w-5" />
                                    </a>
                                </SignedIn>

                                <a href="/doctors" className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-2xl backdrop-blur-md transition border border-white/20">
                                    View Specialists
                                </a>
                            </div>
                        </div>

                        {/* Right Side: 100% Fully Visible Doctor Image Showcase */}
                        <div className="lg:col-span-5 relative flex justify-center">
                            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500 to-blue-500 opacity-30 blur-2xl"></div>
                            <div className="relative w-full max-w-md rounded-3xl overflow-hidden border-2 border-indigo-500/30 shadow-2xl bg-slate-900">
                                <img
                                    src="/images/doctor%20home.jpg"
                                    alt="PrimeCare Doctor Specialist"
                                    className="w-full h-[420px] object-cover object-top hover:scale-105 transition duration-700"
                                />
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent p-6 text-white">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Verified Medical Staff</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-200 mt-1">Ready for 24/7 Consultation & Triage</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Statistics Bar */}
            <section className="bg-white border-y border-slate-200 py-12 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div>
                        <span className="block text-3xl font-black text-indigo-600">80+</span>
                        <span className="text-sm text-slate-500 font-medium">Verified Specialists</span>
                    </div>
                    <div>
                        <span className="block text-3xl font-black text-indigo-600">8+</span>
                        <span className="text-sm text-slate-500 font-medium">Super-Specialty Wings</span>
                    </div>
                    <div>
                        <span className="block text-3xl font-black text-indigo-600">99.8%</span>
                        <span className="text-sm text-slate-500 font-medium">Queue Accuracy</span>
                    </div>
                    <div>
                        <span className="block text-3xl font-black text-indigo-600">24/7</span>
                        <span className="text-sm text-slate-500 font-medium">Emergency Care</span>
                    </div>
                </div>
            </section>

            {/* Core Platform Capabilities */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
                <div className="text-center mb-12">
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-3 inline-block">
                        Advanced Architecture
                    </span>
                    <h2 className="text-3xl font-black text-slate-900 mb-3">Core Platform Capabilities</h2>
                    <p className="text-slate-500 max-w-lg mx-auto text-sm">Engineered for absolute reliability, clinical security, and effortless hospital administration.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {capabilities.map((cap, idx) => {
                        const IconComp = cap.icon;
                        return (
                            <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition duration-300 flex flex-col justify-between group">
                                <div>
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold mb-6 group-hover:bg-indigo-600 group-hover:text-white transition duration-300">
                                        <IconComp className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">{cap.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">{cap.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Key Medical Departments Grid */}
            <section className="bg-slate-100 py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-3 inline-block">
                            Centers of Excellence
                        </span>
                        <h2 className="text-3xl font-black text-slate-900 mb-3">Key Medical Departments</h2>
                        <p className="text-slate-500 max-w-lg mx-auto text-sm">Explore specialized clinical disciplines led by senior HODs and expert medical teams.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        {departments.map((dept) => (
                            <a
                                key={dept}
                                href={`/departments/${encodeURIComponent(dept)}`}
                                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:scale-105 hover:border-indigo-500 hover:shadow-xl transition duration-300 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition duration-300 shadow-sm">
                                        <Stethoscope className="h-5 w-5" />
                                    </div>
                                    <span className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition">{dept}</span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition duration-300" />
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Patient Journey Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
                <div className="text-center mb-16">
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-3 inline-block">
                        Seamless Workflow
                    </span>
                    <h2 className="text-3xl font-black text-slate-900 mb-3">How PrimeCare Works for You</h2>
                    <p className="text-slate-500 max-w-lg mx-auto text-sm">From appointment booking to digital medical records in three simple steps.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((st, idx) => (
                        <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition duration-300 relative overflow-hidden group">
                            <span className="text-5xl font-black text-indigo-50 absolute top-4 right-6 pointer-events-none group-hover:text-indigo-100 transition">{st.step}</span>
                            <div className="relative z-10">
                                <span className="inline-block bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-6 shadow-sm">Step {st.step}</span>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{st.title}</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">{st.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Call to Action Banner */}
            <section className="bg-gradient-to-r from-indigo-900 to-slate-900 py-16 text-white text-center px-4">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl sm:text-4xl font-black mb-4">Ready to Experience World-Class Care?</h2>
                    <p className="text-indigo-200 text-base mb-8 max-w-xl mx-auto">
                        Book your consultation today or access our patient portal to manage appointments and queue tokens effortlessly.
                    </p>
                    <div className="flex justify-center gap-4">
                        <a
                            href="/book-appointment"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl transition transform hover:-translate-y-0.5"
                        >
                            Book Appointment Now
                        </a>
                        <a
                            href="/doctors"
                            className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-2xl backdrop-blur-md transition border border-white/20"
                        >
                            Browse Specialists
                        </a>
                    </div>
                </div>
            </section>

            {/* Professional Footer with User's Logo */}
            <footer className="bg-slate-950 text-slate-400 py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <img
                                src="/logo.jpeg"
                                alt="PrimeCare Logo"
                                className="w-10 h-10 object-contain rounded-xl bg-white p-1 shadow-md border border-slate-800"
                            />
                            <span className="text-xl font-black text-white tracking-tight">PrimeCare Hospital</span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-400 mb-6">
                            Pioneering next-generation healthcare administration through automated queue tokens, verified senior HODs, and encrypted electronic health records.
                        </p>
                        <div className="flex items-center gap-3">
                            <a href="#portal" className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition duration-300 border border-slate-800">
                                <Globe className="h-4 w-4" />
                            </a>
                            <a href="#portal" className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition duration-300 border border-slate-800">
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 border-l-2 border-indigo-600 pl-3">Quick Links</h4>
                        <ul className="space-y-2.5 text-xs font-medium">
                            <li><a href="/about" className="hover:text-indigo-400 transition duration-300 block">About PrimeCare</a></li>
                            <li><a href="/doctors" className="hover:text-indigo-400 transition duration-300 block">Our Specialists & HODs</a></li>
                            <li><a href="/book-appointment" className="hover:text-indigo-400 transition duration-300 block">Book Appointment</a></li>
                            <li><a href="/patient-dashboard" className="hover:text-indigo-400 transition duration-300 block">Patient Dashboard</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 border-l-2 border-indigo-600 pl-3">Departments</h4>
                        <ul className="space-y-2.5 text-xs font-medium">
                            <li><a href="/departments/Cardiology" className="hover:text-indigo-400 transition duration-300 block">Cardiology & Vascular</a></li>
                            <li><a href="/departments/Neurology" className="hover:text-indigo-400 transition duration-300 block">Neurosciences & Stroke</a></li>
                            <li><a href="/departments/Orthopedics" className="hover:text-indigo-400 transition duration-300 block">Orthopedics & Joint Care</a></li>
                            <li><a href="/departments/Pediatrics" className="hover:text-indigo-400 transition duration-300 block">Pediatrics & Neonatal</a></li>
                            <li><a href="/departments/Emergency%20%26%20Trauma" className="hover:text-indigo-400 transition duration-300 block">24/7 Emergency Care</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 border-l-2 border-indigo-600 pl-3">Hospital HQ</h4>
                        <ul className="space-y-3 text-xs">
                            <li className="flex items-start gap-2.5">
                                <MapPin className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                                <span>PrimeCare Medical Tower, Ring Road, Indore, MP, India</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                                <Phone className="h-4 w-4 text-indigo-400 shrink-0" />
                                <span>+91 (0731) 456-7890</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                                <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
                                <span>support@primecarehospital.tech</span>
                            </li>
                        </ul>
                    </div>

                </div>

                <div className="max-w-7xl mx-auto pt-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
                    <p>&copy; 2026 PrimeCare Technologies Pvt Ltd. All rights reserved.</p>
                    <div className="flex items-center gap-6 mt-4 md:mt-0">
                        <span className="hover:text-slate-300 transition cursor-pointer">Privacy Policy</span>
                        <span className="hover:text-slate-300 transition cursor-pointer">Terms of Service</span>
                        <span className="hover:text-slate-300 transition cursor-pointer">HIPAA & EHR Compliance</span>
                    </div>
                </div>
            </footer>

        </div>
    );
}