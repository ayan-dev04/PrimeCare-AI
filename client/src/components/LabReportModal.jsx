import React, { useState } from 'react';
import { Plus, Trash2, X, FlaskConical, CheckCircle2, AlertTriangle } from 'lucide-react';
import DocHeader from './DocHeader';
import API from '../api';

const PANELS = {
    'Complete Blood Count (CBC)': [
        { name: 'Hemoglobin (Hb)', result: '', unit: 'g/dL', referenceRange: '13.0 - 17.0' },
        { name: 'Total Leukocyte Count (WBC)', result: '', unit: 'cells/µL', referenceRange: '4,000 - 11,000' }
    ],
    'Lipid Profile': [
        { name: 'Total Cholesterol', result: '', unit: 'mg/dL', referenceRange: '< 200' },
        { name: 'LDL Cholesterol', result: '', unit: 'mg/dL', referenceRange: '< 100' }
    ]
};

export default function LabReportModal({ appointment, doctorProfile, onClose, onPublish }) {
    const [panelName, setPanelName] = useState(`${doctorProfile?.department || 'General'} Panel - Diagnostic Study`);
    const [selectedCats, setSelectedCats] = useState([]);
    const [tests, setTests] = useState([]);
    const [summaryImpression, setSummaryImpression] = useState('');
    const [saveLoading, setSaveLoading] = useState(false);

    const toggleCategory = (cat) => {
        setSelectedCats(prev => {
            const chosen = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat];
            const predefined = chosen.flatMap(c => PANELS[c] || []);
            setTests(predefined);
            return chosen;
        });
    };

    const addTestRow = () => setTests(prev => [...prev, { name: '', result: '', unit: '', referenceRange: '', flag: 'normal' }]);
    const updateTest = (i, field, value) => setTests(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
    const removeTest = (i) => setTests(prev => prev.filter((_, idx) => idx !== i));

    // Save Lab Report and store in Patient Records Hub so only that patient can see it
    const handlePublish = async (e) => {
        e.preventDefault();
        const validTests = tests.filter(t => t.name.trim());
        if (!panelName || validTests.length === 0) return alert('Panel name and at least one test entry are required.');

        setSaveLoading(true);
        try {
            const payload = {
                appointmentId: appointment._id,
                panelName,
                selectedCats,
                tests: validTests,
                summaryImpression,
                doctorId: doctorProfile._id,
                doctorName: doctorProfile.name,
                department: doctorProfile.department
            };

            const { data } = await API.post('/doctors/lab-reports', payload);

            // Register lab report into patient medical records for patient-only dashboard visibility
            await API.post('/appointments/records', {
                patientId: appointment.patient || appointment.patientEmail,
                patientName: appointment.patientName,
                title: panelName,
                category: 'Lab Report',
                doctorName: doctorProfile.name,
                department: doctorProfile.department,
                fileUrl: `/api/doctors/lab-reports/download/${data.labReport._id}`,
                notes: summaryImpression,
                uploadedBy: 'doctor'
            });

            onPublish(data.labReport);
            onClose();
        } catch (err) {
            alert('Failed to save lab report.');
        } finally {
            setSaveLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
            <form onSubmit={handlePublish} className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[92vh]">
                <div className="px-6 py-4 bg-slate-900 flex items-center justify-between rounded-t-3xl shrink-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                        <FlaskConical className="w-4 h-4" /> Quick Lab Report Builder
                    </span>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
                    <DocHeader subtitle="Pathology Report" />

                    <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                        <div><span className="text-slate-500 text-[10px] block">Patient</span><strong>{appointment.patientName}</strong></div>
                        <div><span className="text-slate-500 text-[10px] block">Token</span><span className="font-mono font-bold text-indigo-700">{appointment.tokenNumber}</span></div>
                        <div><span className="text-slate-500 text-[10px] block">Date</span>{appointment.date}</div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Panel Name</label>
                        <input
                            type="text" required value={panelName}
                            onChange={e => setPanelName(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-700">Test Parameters</label>
                            <button type="button" onClick={addTestRow} className="text-xs text-teal-600 font-bold hover:underline">+ Add Test</button>
                        </div>
                        {tests.map((t, idx) => (
                            <div key={idx} className="flex gap-1.5 items-center">
                                <input placeholder="Test Name" required value={t.name} onChange={e => updateTest(idx, 'name', e.target.value)} className="flex-2 text-xs p-2 rounded-lg border border-slate-200" />
                                <input placeholder="Result" value={t.result} onChange={e => updateTest(idx, 'result', e.target.value)} className="w-20 text-xs p-2 rounded-lg border border-slate-200" />
                                <input placeholder="Unit" value={t.unit} onChange={e => updateTest(idx, 'unit', e.target.value)} className="w-16 text-xs p-2 rounded-lg border border-slate-200" />
                                <input placeholder="Range" value={t.referenceRange} onChange={e => updateTest(idx, 'referenceRange', e.target.value)} className="w-24 text-xs p-2 rounded-lg border border-slate-200" />
                                <button type="button" onClick={() => removeTest(idx)} className="text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Impression</label>
                        <textarea rows={2} value={summaryImpression} onChange={e => setSummaryImpression(e.target.value)} className="w-full text-xs p-2.5 rounded-xl border border-slate-200" />
                    </div>
                </div>

                <div className="flex gap-3 p-6 pt-0 shrink-0">
                    <button type="submit" disabled={saveLoading} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-2xl text-xs transition">
                        {saveLoading ? 'Saving...' : 'Save & Store in Patient Hub'}
                    </button>
                    <button type="button" onClick={onClose} className="bg-slate-100 text-slate-700 font-bold px-5 py-3 rounded-2xl text-xs">Cancel</button>
                </div>
            </form>
        </div>
    );
}