import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import DocHeader from './DocHeader';
import API from '../api';

export default function PrescriptionModal({ prescription, onClose }) {
    if (!prescription) return null;

    // Direct PDF download from correct doctor download endpoint
    const handleDownloadPdf = async () => {
        try {
            const response = await API.get(`/doctors/prescriptions/download/${prescription._id}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Prescription-${prescription.patientName || 'Patient'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Failed to download prescription PDF.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 font-sans">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">

                {/* Modal Header */}
                <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-400" /> Digital E-Prescription
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadPdf}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold transition"
                        >
                            Download Prescription PDF
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Prescription Body */}
                <div className="p-8 overflow-y-auto space-y-6">
                    <DocHeader subtitle="Digital E-Prescription" />

                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                        <div>
                            <p className="text-slate-500 font-semibold uppercase text-[10px]">Patient Information</p>
                            <p className="font-bold text-slate-900 text-sm">{prescription.patientName}</p>
                            <p className="text-slate-600">ID: {prescription.patientId?.slice(0, 14)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-500 font-semibold uppercase text-[10px]">Consulting Specialist</p>
                            <p className="font-bold text-indigo-900 text-sm">{prescription.doctorName}</p>
                            <p className="text-slate-600">{prescription.department} Department</p>
                            <p className="text-slate-400 text-[10px]">{new Date(prescription.createdAt || Date.now()).toLocaleDateString('en-IN')}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Diagnosis:</span>
                            <span className="text-sm font-black text-slate-900">{prescription.diagnosis}</span>
                        </div>

                        {prescription.vitals && (
                            <div className="grid grid-cols-4 gap-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 text-center text-xs">
                                <div>
                                    <span className="text-[10px] text-indigo-700 block font-medium">BP</span>
                                    <span className="font-bold text-slate-800">{prescription.vitals.bloodPressure || '120/80'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-indigo-700 block font-medium">Pulse</span>
                                    <span className="font-bold text-slate-800">{prescription.vitals.pulseRate || '72 bpm'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-indigo-700 block font-medium">Temp</span>
                                    <span className="font-bold text-slate-800">{prescription.vitals.temperature || '98.6 °F'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-indigo-700 block font-medium">SpO2</span>
                                    <span className="font-bold text-slate-800">{prescription.vitals.spO2 || '98%'}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Prescribed Medications</p>
                        <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                            <thead className="bg-slate-100 text-slate-700 text-left">
                                <tr>
                                    <th className="p-2.5">Medicine Name</th>
                                    <th className="p-2.5">Dosage</th>
                                    <th className="p-2.5">Frequency</th>
                                    <th className="p-2.5">Duration</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {prescription.medicines?.map((med, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-2.5 font-bold text-slate-900">{med.name}</td>
                                        <td className="p-2.5 text-slate-600">{med.dosage}</td>
                                        <td className="p-2.5 text-slate-600">{med.frequency}</td>
                                        <td className="p-2.5 text-slate-600">{med.duration}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 text-xs">
                        <span className="font-bold text-amber-900 block mb-1">Doctor's Clinical Advice:</span>
                        <p className="text-slate-700 leading-relaxed">{prescription.clinicalAdvice || 'Take plenty of fluids and rest.'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}