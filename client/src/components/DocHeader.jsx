import React from 'react';

// Shared PrimeCare brand header — identical styling to site Navbar (logo + Indigo typography)
// Used on all generated medical documents (prescriptions, lab reports) for brand consistency
export default function DocHeader({ subtitle }) {
    return (
        <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-4">
            <div className="flex items-center gap-3">
                {/* Logo badge — same white circle + indigo ring as Navbar brand */}
                <div className="w-14 h-14 rounded-full bg-white shadow-md border-2 border-indigo-100 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                    <img src="/logo.jpeg" alt="PrimeCare Logo" className="w-full h-full object-contain rounded-full" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">PrimeCare</span>
                    <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest">Hospital</span>
                </div>
            </div>
            <div className="text-right">
                {subtitle && <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">{subtitle}</p>}
                <p className="text-[10px] text-slate-500 font-medium leading-tight">
                    Ring Road, Medical Square, Indore<br />
                    OPD Hotline: +91 (0731) 456-7890
                </p>
            </div>
        </div>
    );
}
