import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../api';
import { CheckCircle2, ArrowLeft, Star, Award, Clock, IndianRupee, Calendar, X, Stethoscope } from 'lucide-react';

export default function DepartmentDetail() {
    const { deptName } = useParams();
    const navigate = useNavigate();
    const decodedDept = decodeURIComponent(deptName || 'Cardiology');
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoctor, setSelectedDoctor] = useState(null);

    useEffect(() => {
        fetchDepartmentDoctors();
    }, [decodedDept]);

    const fetchDepartmentDoctors = async () => {
        try {
            setLoading(true);
            // Dedicated department endpoint — case-insensitive regex match on backend
            const { data } = await API.get(`/doctors/department/${encodeURIComponent(decodedDept)}`);
            const deptDoctors = Array.isArray(data?.doctors) ? data.doctors : [];
            if (deptDoctors.length === 0) console.warn(`[DepartmentDetail] 0 doctors for "${decodedDept}" — verify DB department strings vs URL slug.`);
            setDoctors(deptDoctors);
        } catch (err) {
            console.error('Failed to fetch department doctors:', err);
            setDoctors([]); // graceful degradation instead of crash
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'DR';
        const cleanName = name.replace(/Dr\./g, '').replace(/\(HOD\)/g, '').trim();
        const parts = cleanName.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return cleanName.substring(0, 2).toUpperCase();
    };

    // Identify HOD (Senior Male HOD) and other specialists
    const hod = doctors.find(doc => doc.name.includes('(HOD)')) || doctors[0];
    const otherDoctors = doctors.filter(doc => doc._id !== hod?._id);

    // Department image mapping with encodeURI to properly handle spaces in filenames
    const departmentImages = {
        "Cardiology": encodeURI("/images/cardiology department .jpg"),
        "Neurology": encodeURI("/images/Neurology Departement.jpg"),
        "Orthopedics": encodeURI("/images/Orthopedics department .jpg"),
        "Pediatrics": encodeURI("/images/pediatrics department.jpg"),
        "Emergency & Trauma": encodeURI("/images/Emergency and Trauma Department.jpg"),
        "Oncology": encodeURI("/images/Oncology Department.jpeg"),
        "Dermatology": encodeURI("/images/Dermatalogy Department.jpeg"),
        "General Medicine": encodeURI("/images/General Medicine Department.jpg")
    };

    const currentImage = departmentImages[decodedDept] || encodeURI("/images/cardiology department .jpg");

    // Comprehensive Department Content modeled after top hospitals
    const departmentData = {
        "Cardiology": {
            title: "Cardiology Department of PrimeCare Hospital",
            overview: "At PrimeCare Hospital, the Cardiology Department is dedicated to the diagnosis, treatment, and management of disorders affecting the heart and blood vessels. With a team of experienced cardiologists and state-of-the-art catheterization labs, we offer advanced care for conditions such as coronary artery disease, heart failure, arrhythmias, and more.",
            mission: "We emphasize early diagnosis, precision interventions, and comprehensive management plans for chronic cardiovascular conditions. Our mission is to improve quality of life through expert care, compassionate support, and personalized treatment strategies.",
            highlights: [
                "Advanced diagnostic services, including ECG, Echocardiography, Holter monitoring, and Coronary Angiography.",
                "Specialized care for heart failure, myocardial infarction, hypertension, and congenital heart defects.",
                "Comprehensive treatment options, including angioplasty, stenting, pacemaker implantation, and cardiac rehabilitation.",
                "Multidisciplinary approach, collaborating with cardiac surgeons and critical care specialists for holistic patient care.",
                "24/7 Emergency cardiac care for acute coronary syndromes with rapid response protocols.",
                "Patient-focused care with customized lifestyle management plans and ongoing follow-ups."
            ],
            whyChooseUs: "PrimeCare Hospital combines the latest advancements in cardiovascular medicine with a compassionate, patient-centered approach. Our highly skilled cardiologists work tirelessly to identify the best possible treatment for your condition, ensuring your heart health remains our top priority."
        },
        "Neurology": {
            title: "Neurology Department of PrimeCare Hospital",
            overview: "At PrimeCare Hospital, the Neurology Department is dedicated to the diagnosis, treatment, and management of disorders affecting the brain, spinal cord, and nervous system. With a team of experienced neurologists and state-of-the-art facilities, we offer advanced care for conditions such as stroke, epilepsy, dementia, movement disorders, and more.",
            mission: "We emphasize early diagnosis, precision treatments, and comprehensive management plans for chronic neurological conditions. Our mission is to improve quality of life through expert care, compassionate support, and personalized treatment strategies.",
            highlights: [
                "Advanced diagnostic services, including MRI, CT scans, EEG, and nerve conduction studies.",
                "Specialized care for stroke, epilepsy, Alzheimer's, Parkinson's, and other neurological disorders.",
                "Comprehensive treatment options, including medication, therapies, and surgical interventions.",
                "Multidisciplinary approach, collaborating with specialists from other departments for holistic care.",
                "Emergency care for acute neurological events, including stroke management.",
                "Expert management of chronic neurological conditions to improve patients' quality of life."
            ],
            whyChooseUs: "PrimeCare Hospital combines the latest advancements in neurology with a compassionate, patient-centered approach. Our highly skilled neurologists work with you to identify the best possible treatment for your condition, prioritizing your health and well-being."
        },
        "Orthopedics": {
            title: "Orthopedics Department of PrimeCare Hospital",
            overview: "At PrimeCare Hospital, the Orthopedics Department specializes in the diagnosis, surgical and non-surgical treatment of musculoskeletal system disorders, bones, joints, ligaments, tendons, and nerves.",
            mission: "We are committed to restoring mobility and alleviating joint pain through cutting-edge robotic joint replacements, arthroscopic procedures, and personalized rehabilitation.",
            highlights: [
                "Robotic Joint Replacement for Total Knee and Hip surgeries.",
                "Advanced Arthroscopy and Sports Injury rehabilitation units.",
                "Spine surgery and trauma reconstruction care.",
                "Pediatric orthopedics and deformity correction programs."
            ],
            whyChooseUs: "Our orthopedic specialists utilize minimally invasive techniques to ensure faster recovery times, less postoperative discomfort, and long-lasting joint stability."
        },
        "Pediatrics": {
            title: "Pediatrics Department of PrimeCare Hospital",
            overview: "The Pediatrics Department provides comprehensive medical care for infants, children, and adolescents in a warm, child-friendly environment supported by expert pediatricians.",
            mission: "Promoting healthy growth and development while providing compassionate, specialized care for acute and chronic childhood illnesses.",
            highlights: [
                "24/7 Pediatric Emergency and Neonatal Intensive Care Unit (NICU).",
                "Comprehensive immunization and vaccination schedules.",
                "Childhood developmental assessment and pediatric neurology.",
                "Adolescent health and nutritional counseling."
            ],
            whyChooseUs: "We treat every child with utmost gentleness and care, ensuring parents are fully informed and involved in every step of the healing process."
        },
        "Emergency & Trauma": {
            title: "Emergency & Trauma Department of PrimeCare Hospital",
            overview: "PrimeCare's 24/7 Emergency & Trauma Center is equipped with cutting-edge life support systems, dedicated trauma bays, and rapid-response critical care physicians.",
            mission: "Providing immediate, life-saving stabilization and multidisciplinary trauma surgery around the clock.",
            highlights: [
                "Advanced Advanced Life Support (ALS) ambulances on standby.",
                "Dedicated resuscitation bays with point-of-care ultrasound and CT imaging.",
                "Rapid stroke and cardiac emergency triage protocols.",
                "Multidisciplinary trauma surgery teams available 24/7."
            ],
            whyChooseUs: "Every second counts in an emergency. Our trauma unit is optimized for zero-delay triage and flawless emergency coordination."
        },
        "Oncology": {
            title: "Oncology Department of PrimeCare Hospital",
            overview: "The Oncology Department offers comprehensive cancer care encompassing medical, surgical, and radiation oncology with advanced diagnostic imaging and chemotherapy suites.",
            mission: "Delivering personalized, evidence-based cancer therapy with unwavering emotional and clinical support for patients and families.",
            highlights: [
                "State-of-the-art PET-CT and linear accelerator radiation therapy.",
                "Targeted immunotherapy and precision medical oncology.",
                "Multidisciplinary tumor board reviews for complex cancer cases.",
                "Dedicated palliative care and psycho-oncology support."
            ],
            whyChooseUs: "We stand beside you in your fight against cancer, offering world-class medical expertise combined with deep empathy and compassionate care."
        },
        "Dermatology": {
            title: "Dermatology Department of PrimeCare Hospital",
            overview: "Our Dermatology Department specializes in clinical, surgical, and aesthetic skin care, treating chronic skin disorders, hair conditions, and nail disorders.",
            mission: "Enhancing skin health and confidence through advanced dermatological treatments and state-of-the-art laser technology.",
            highlights: [
                "Advanced laser therapy for scars, pigmentation, and rejuvenation.",
                "Specialized care for psoriasis, eczema, acne, and autoimmune skin diseases.",
                "Dermatosurgery and skin biopsy procedures.",
                "Pediatric and geriatric dermatology."
            ],
            whyChooseUs: "Combining medical science with aesthetic precision, our dermatologists provide tailored solutions for healthy, glowing skin."
        },
        "General Medicine": {
            title: "General Medicine Department of PrimeCare Hospital",
            overview: "The General Medicine Department serves as the cornerstone of hospital care, providing comprehensive diagnosis and management of adult diseases, infections, and chronic conditions.",
            mission: "Offering holistic, primary and secondary healthcare management focusing on preventive medicine and chronic disease control.",
            highlights: [
                "Comprehensive health check-up packages and preventive screenings.",
                "Management of lifestyle diseases such as diabetes, hypertension, and thyroid disorders.",
                "Infectious disease diagnosis and fever clinics.",
                "Seamless referral coordination with super-specialty departments."
            ],
            whyChooseUs: "Our general physicians act as your primary healthcare advocates, coordinating all your medical needs with accuracy and deep clinical insight."
        }
    };

    const deptContent = departmentData[decodedDept] || departmentData["Cardiology"];

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-5xl mx-auto">
                <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm mb-6 hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>

                {/* Section 1: Title & Overview with Image on Right */}
                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 mb-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-4 inline-block">
                                Department of Excellence
                            </span>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">{deptContent.title}</h1>
                            <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-4">{deptContent.overview}</p>
                            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{deptContent.mission}</p>
                        </div>
                        <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-100">
                            <img
                                src={currentImage}
                                alt={decodedDept}
                                className="w-full h-80 object-cover object-center hover:scale-105 transition duration-500"
                                onError={(e) => { e.target.src = "/images/cardiology department .jpg"; }}
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/80 to-transparent p-4 text-white text-xs font-medium text-center">
                                PrimeCare {decodedDept} Advanced Clinical Suite
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Highlights of the Department */}
                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 mb-8">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6">Highlights of the department</h2>
                    <div className="space-y-4">
                        {deptContent.highlights.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                                <p className="text-slate-700 text-sm sm:text-base font-medium">{item}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 3: Why Choose Us? */}
                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 mb-12">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4">Why Choose Us?</h2>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-4">{deptContent.whyChooseUs}</p>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                        Whether through medication, advanced therapies, or surgical intervention, our multidisciplinary team prioritizes your health, safety, and rapid recovery above all.
                    </p>
                </div>

                {/* Dynamic Database HOD Section */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                    </div>
                ) : hod ? (
                    <div
                        onClick={() => setSelectedDoctor(hod)}
                        className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl mb-12 flex flex-col md:flex-row items-center gap-8 cursor-pointer hover:shadow-2xl hover:scale-[1.01] transition-all duration-300"
                    >
                        <div className="w-36 h-36 rounded-full bg-white/10 text-white font-black text-3xl flex items-center justify-center border-4 border-white/20 shadow-2xl shrink-0">
                            {getInitials(hod.name)}
                        </div>
                        <div>
                            <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 inline-block">
                                Head of Department (HOD)
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-black mb-1">{hod.name}</h2>
                            <p className="text-indigo-200 text-sm font-semibold mb-3">{hod.degree || hod.qualification}</p>
                            <p className="text-slate-300 text-xs sm:text-sm mb-4 leading-relaxed">
                                Leading the Department of {decodedDept} with over {hod.experienceYears} years of elite clinical expertise and advanced surgical procedures. Trained at {hod.college || 'PrimeCare Academy of Medicine'}.
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                                <span className="bg-white/10 px-3 py-1.5 rounded-xl">Experience: {hod.experienceYears} Years</span>
                                <span className="bg-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1 text-amber-400">
                                    <Star className="h-3.5 w-3.5 fill-amber-400" /> {hod.rating || '4.9'} Rating
                                </span>
                                        <span className="bg-white/10 px-3 py-1.5 rounded-xl">Fee: {hod.consultationFee} Rs</span>
                                {hod.awards?.length > 0 && (
                                    <span className="bg-amber-500/20 px-3 py-1.5 rounded-xl text-amber-300">{hod.awards[0]}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Department Specialists List */}
                <div className="mb-12">
                    <h2 className="text-2xl font-black text-slate-900 mb-6">Our {decodedDept} Specialists</h2>
                    {doctors.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm">
                            <Stethoscope className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-bold text-slate-800 mb-1">No doctors available in this department currently.</h3>
                            <p className="text-slate-500 text-xs">Please check back soon or explore another department.</p>
                        </div>
                    ) : otherDoctors.length === 0 ? (
                        <p className="text-slate-500 text-sm">No additional specialists listed at this moment.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {otherDoctors.map(doc => (
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
                                            <p className="text-xs font-bold text-slate-600 line-clamp-1 mt-0.5">{doc.degree || doc.qualification}</p>
                                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{doc.college}</p>
                                        </div>
                                    </div>
                                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-600">
                                        <span>Exp: <strong>{doc.experienceYears} Yrs</strong></span>
                                        <span className="font-extrabold text-indigo-600">{doc.consultationFee} Rs</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <Link
                        to="/book-appointment"
                        className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl shadow-lg transition"
                    >
                        Book Consultation in {decodedDept}
                    </Link>
                </div>

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