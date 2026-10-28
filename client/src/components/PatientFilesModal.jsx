import React, { useState, useEffect } from 'react';
import API from '../api';
import { X, Upload, FileText, FileImage, Download, Loader2, FolderOpen } from 'lucide-react';

// Patient Files Viewer: shows all documents uploaded by the booked patient for this consultation
// and lets the doctor securely attach prescriptions/reports straight into the patient's records hub
export default function PatientFilesModal({ appointment, doctorProfile, onClose }) {
    const [files, setFiles] = useState([]);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Prescription');
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const patientId = appointment.patient || appointment.patientEmail;

    const loadFiles = async () => {
        try {
            const { data } = await API.get(`/doctors/files/doctor/${doctorProfile._id}/patient/${encodeURIComponent(patientId)}`);
            setFiles(data.files || []);
        } catch (err) {
            console.error('File viewer access denied or failed.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadFiles(); }, [patientId]);

    // Multipart secure upload (PDF/DOC/images) → patient dashboard immediately sees the new file
    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile || !title.trim()) return alert('File and title are both required.');
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', selectedFile);
            fd.append('patientId', patientId);
            fd.append('patientName', appointment.patientName);
            fd.append('title', title);
            fd.append('category', category);
            await API.post(`/doctors/records/doctor-upload/${doctorProfile._id}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSelectedFile(null);
            setTitle('');
            loadFiles();
        } catch (err) {
            alert(err.response?.data?.error || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 font-sans">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[88vh]">
                {/* Header */}
                <div className="px-6 py-4 bg-slate-900 flex items-center justify-between rounded-t-3xl shrink-0 print:hidden">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <FolderOpen className="w-4 h-4" /> Patient Records: {appointment.patientName}
                    </span>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 overflow-y-auto space-y-5">
                    {/* Consultation Context */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-[11px] text-slate-600">
                        <strong className="text-slate-900">{appointment.reason}</strong> • {appointment.date} at {appointment.timeSlot}
                    </div>

                    {/* Uploader (attach prescriptions / result scans / referral letters) */}
                    <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text" required value={title} onChange={e => setTitle(e.target.value)}
                                placeholder="Document Title (e.g. MRI Scan Summary)"
                                className="text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none"
                            />
                            <select value={category} onChange={e => setCategory(e.target.value)}
                                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none">
                                {['Prescription', 'Lab Report', 'Discharge Summary', 'Imaging/Scan', 'Diagnostic Report', 'Other'].map(c => (
                                    <option key={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <label className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
                            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {uploading ? 'Uploading...' : 'Attach File'}
                            <input type="file" accept=".pdf,.doc,.docx,image/*" className="hidden"
                                onChange={e => setSelectedFile(e.target.files[0])} disabled={uploading} />
                        </label>
                    </form>
                    {selectedFile && <p className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">Selected: {selectedFile.name}</p>}

                    {/* Flat Document Grid from patient's uploaded history */}
                    <div>
                        <p className="text-xs font-bold text-slate-700 mb-2">Documents Shared by Patient ({files.length})</p>
                        {loading ? (
                            <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading secure records...
                            </div>
                        ) : files.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                                No documents uploaded by this patient yet.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {files.map(f => (
                                    <div key={f._id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-1.5">
                                                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{f.category}</span>
                                                <span className="text-[10px] text-slate-400">{f.recordDate}</span>
                                            </div>
                                            <h4 className="font-bold text-slate-900 text-xs">{f.title}</h4>
                                            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                                                {f.fileType?.includes('image') ? <FileImage className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                                {f.fileName?.slice(0, 24)} • {(f.fileSize / 1024).toFixed(0)} KB
                                            </p>
                                            {f.notes && <p className="text-[10px] italic text-slate-500 mt-1">"{f.notes}"</p>}
                                        </div>
                                        <a
                                            href={`http://localhost:5000/api/doctors/files/record/${f._id}?email=${encodeURIComponent(doctorProfile.email)}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="mt-3 bg-white border border-slate-200 hover:bg-indigo-50 text-indigo-700 font-bold text-[10px] py-1.5 rounded-xl flex items-center justify-center gap-1 transition"
                                        >
                                            <Download className="w-3 h-3" /> Inspect Document
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
