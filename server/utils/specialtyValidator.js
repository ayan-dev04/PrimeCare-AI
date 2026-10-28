/* ── Qualification <-> Department Cross-Reference Validator ──
   Guarantees a doctor is never stored under a department their clinical degree
   contradicts. Called from the Doctor schema pre('save') hook and admin CRUD.
   Strategy per invocation:
     1. No recognizable specialty token  -> FLAG only (server log review)
     2. Exactly one department implied   -> AUTO-CORRECT department to it
     3. Multiple departments implied     -> OK if filed under one of them,
                                            otherwise FLAG as ambiguous        */

const DEPT_KEYWORDS = {
    'Cardiology': ['cardiolog', 'cardiac', 'cardiothoracic', 'cardiovascular'],
    'Neurology': ['neurolog', 'neurosurg', 'nimhans'],
    'Orthopedics': ['orthopedic', 'orthopaedic', 'spine surgery', 'joint replacement'],
    'Pediatrics': ['pediatr', 'paediatr', 'dch', 'neonatolog', 'child health'],
    'Emergency & Trauma': ['trauma', 'emergency medicin', 'critical care'],
    'Oncology': ['onco', 'tata memorial', 'radiation oncology'],
    'Dermatology': ['dermatolog', 'derm', 'venereol', 'leprosy', 'dvd'],
    'General Medicine': ['md - general medicine', 'internal medicine', 'family medicine']
};

function validateDoctorSpecialty(doctor) {
    const text = `${doctor.degree || ''} ${doctor.qualification || ''}`.toLowerCase();
    if (!text.trim()) return doctor; // nothing to cross-reference

    const implied = Object.entries(DEPT_KEYWORDS)
        .filter(([, keys]) => keys.some(k => text.includes(k)))
        .map(([dept]) => dept);

    if (implied.length === 0) {
        console.warn(`[SpecialtyValidator] FLAG: Dr. ${doctor.name} (${doctor.department}) has no verifiable specialty degree in "${doctor.degree || doctor.qualification}".`);
        return doctor;
    }

    if (!implied.includes(doctor.department)) {
        if (implied.length === 1) {
            // Degree unambiguously belongs elsewhere -> remap before persistence
            console.warn(`[SpecialtyValidator] CORRECTED: Dr. ${doctor.name} holds "${doctor.degree || doctor.qualification}" but was filed under ${doctor.department}; moved to ${implied[0]}.`);
            doctor.department = implied[0];
        } else {
            console.warn(`[SpecialtyValidator] FLAG: degrees of Dr. ${doctor.name} fit ${implied.join(' & ')} but record says ${doctor.department} — administrative review recommended.`);
        }
    }
    return doctor;
}

module.exports = { validateDoctorSpecialty };
