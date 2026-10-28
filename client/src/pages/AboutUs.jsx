import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HeartPulse, Award, Users, CheckCircle2, Target, Compass, Clock, ArrowRight, Stethoscope } from 'lucide-react';

export default function AboutUs() {
    const stats = [
        { label: 'Qualified Specialists', value: '80+' },
        { label: 'Advanced Departments', value: '8+' },
        { label: 'Patient Satisfaction', value: '99.4%' },
        { label: 'Emergency Support', value: '24/7' }
    ];

    const values = [
        {
            title: 'Patient-First Approach',
            desc: 'Every clinical decision, consultation, and treatment plan is centered around the comfort, dignity, and recovery of our patients.',
            icon: HeartPulse
        },
        {
            title: 'Clinical Excellence',
            desc: 'Led by senior HODs with 25+ years of experience, we maintain uncompromising medical standards and evidence-based protocols.',
            icon: Award
        },
        {
            title: 'Advanced Technology',
            desc: 'Equipped with next-gen diagnostic suites, robotic surgical assistants, and real-time patient queue management systems.',
            icon: ShieldCheck
        },
        {
            title: 'Compassionate Care',
            desc: 'We believe healing extends beyond medicine. Our nursing and support staff provide empathetic care throughout your journey.',
            icon: Users
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto">

                {/* Hero Section */}
                <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-8 sm:p-16 text-white shadow-xl mb-12 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="max-w-3xl relative z-10">
                        <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block">
                            About PrimeCare Hospital
                        </span>
                        <h1 className="text-3xl sm:text-5xl font-black mb-6 tracking-tight">
                            Pioneering Healthcare Excellence & Compassionate Healing
                        </h1>
                        <p className="text-indigo-100 text-base sm:text-lg leading-relaxed mb-8">
                            Founded on the pillars of advanced medical technology, expert clinical leadership, and unwavering patient trust, PrimeCare Hospital stands as a beacon of world-class healthcare.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link
                                to="/doctors"
                                className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold px-6 py-3.5 rounded-2xl shadow-md transition flex items-center gap-2 text-sm"
                            >
                                <Stethoscope className="h-4 w-4" /> Meet Our Specialists
                            </Link>
                            <Link
                                to="/book-appointment"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-md transition flex items-center gap-2 text-sm"
                            >
                                Book Consultation <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Statistics Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center">
                            <span className="block text-3xl sm:text-4xl font-black text-indigo-600 mb-1">{stat.value}</span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-500">{stat.label}</span>
                        </div>
                    ))}
                </div>

                {/* Mission & Vision Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                    <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-200 flex flex-col justify-between">
                        <div>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                                <Target className="h-6 w-6" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">Our Mission</h2>
                            <p className="text-slate-600 text-base leading-relaxed">
                                To deliver accessible, affordable, and world-class tertiary healthcare services through clinical innovation, relentless dedication, and a deep commitment to patient safety and well-being.
                            </p>
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-2 text-sm font-bold text-indigo-600">
                            <CheckCircle2 className="h-5 w-5" /> Patient outcomes above all else
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-200 flex flex-col justify-between">
                        <div>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                                <Compass className="h-6 w-6" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">Our Vision</h2>
                            <p className="text-slate-600 text-base leading-relaxed">
                                To be globally recognized as a premier multi-specialty institution where cutting-edge medical science meets human empathy, setting new benchmarks in healthcare delivery.
                            </p>
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-2 text-sm font-bold text-indigo-600">
                            <CheckCircle2 className="h-5 w-5" /> Setting global standards in clinical care
                        </div>
                    </div>
                </div>

                {/* Core Values Grid */}
                <div className="mb-16">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-3 inline-block">
                            Our Principles
                        </span>
                        <h2 className="text-3xl font-black text-slate-900 mb-3">Core Values That Drive Us</h2>
                        <p className="text-slate-500 text-sm">The foundational beliefs that guide our doctors, nurses, and staff every single day.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {values.map((val, idx) => {
                            const IconComponent = val.icon;
                            return (
                                <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition flex flex-col justify-between">
                                    <div>
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                                            <IconComponent className="h-6 w-6" />
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-900 mb-2">{val.title}</h3>
                                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{val.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Leadership / Director's Message */}
                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 mb-12 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-indigo-900 text-white font-black text-4xl flex items-center justify-center border-4 border-indigo-100 shadow-xl shrink-0">
                        DR
                    </div>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-2 inline-block">
                            Leadership Message
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Dr. Aakarsh Khanna</h2>
                        <p className="text-indigo-600 font-semibold text-sm mb-4">Chief Medical Director & Senior HOD, PrimeCare Hospital</p>
                        <p className="text-slate-600 text-sm sm:text-base leading-relaxed italic mb-4">
                            "At PrimeCare, we believe that medicine is not just about treating symptoms—it is about restoring lives and bringing peace of mind to families. Our team of senior specialists and state-of-the-art facilities ensure that every patient receives uncompromising, personalized care."
                        </p>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <Clock className="h-4 w-4 text-indigo-600" /> Over 28 Years of Dedicated Clinical Leadership
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}