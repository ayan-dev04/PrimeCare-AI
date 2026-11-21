const Appointment = require('../models/Appointment');

/* ── MCDA Doctor-Patient Suitability Engine ──
   SuitabilityScore = 100 * (w1*Match + w2*WorkloadScore + w3*ServiceRateScore)
   w1 = 0.5  specialization match (binary/semantic)
   w2 = 0.3  inverse current workload (shorter live queue ranks higher)
   w3 = 0.2  inverse historical service time (faster consults rank higher) */

const WEIGHTS = { specialization: 0.5, workload: 0.3, serviceRate: 0.2 };

// Symptom -> department alias table: lets raw patient phrasing drive a graded
// semantic match instead of a strict string equality against department names
const SYMPTOM_MAP = {
    'Cardiology': ['chest', 'cardiac', 'heart', 'palpitation', 'blood pressure', 'bp', 'cholesterol'],
    'Neurology': ['headache', 'migraine', 'seizure', 'stroke', 'numbness', 'dizziness', 'vertigo', 'epilepsy', 'brain'],
    'Orthopedics': ['joint', 'fracture', 'bone', 'knee', 'shoulder', 'back pain', 'spine', 'sprain', 'muscle'],
    'Pediatrics': ['child', 'baby', 'infant', 'kid', 'toddler', 'newborn', 'teen'],
    'Emergency & Trauma': ['accident', 'trauma', 'emergency', 'bleeding', 'injury', 'unconscious', 'burn'],
    'Oncology': ['cancer', 'tumor', 'tumour', 'chemotherapy', 'lump', 'malignant', 'biopsy'],
    'Dermatology': ['skin', 'rash', 'acne', 'eczema', 'psoriasis', 'itching', 'hair fall', 'hair loss'],
    'General Medicine': ['fever', 'cold', 'cough', 'flu', 'infection', 'vomiting', 'diarrhea', 'diabetes', 'weakness']
};

// C1: Specialization match, graded 0..1.
//     exact department name -> 1.0, symptom keyword hit -> 0.85 (or 0.15 if
//     symptoms point at a different department), partial token overlap -> 0.5
function matchSpecialty(requested, department) {
    const q = (requested || '').toLowerCase().trim();
    const dept = (department || '').toLowerCase();
    if (!q) return 0.35; // no patient context -> neutral, workload/history carry the score
    if (q === dept || dept.includes(q) || q.includes(dept)) return 1.0;

    const hitDepts = Object.entries(SYMPTOM_MAP)
        .filter(([, keys]) => keys.some(k => q.includes(k)))
        .map(([d]) => d);

    if (hitDepts.length) {
        return hitDepts.some(d => d.toLowerCase() === dept) ? 0.85 : 0.15;
    }
    const qtok = q.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
    const overlap = dept.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t && qtok.includes(t)).length;
    return overlap ? 0.5 : 0.05;
}

/* Main service function: ranks the loaded candidate pool.
   Both live queue counts and historical service speeds are pulled with two
   aggregation queries (O(1) DB round-trips regardless of candidate count), then
   min-max normalized across the pool so all dimensions share a comparable scale. */
async function calculateDoctorScores(department, availableDoctors) {
    if (!availableDoctors?.length) return [];

    const ids = availableDoctors.map(d => d._id);
    const today = new Date().toISOString().split('T')[0];

    const [workloadRows, rateRows] = await Promise.all([
        // C2 workload: today's actively pending consultations per doctor
        Appointment.aggregate([
            { $match: { doctor: { $in: ids }, status: { $in: ['scheduled', 'in-progress'] }, date: today } },
            { $group: { _id: '$doctor', count: { $sum: 1 } } }
        ]),
        // C3 service rate: mean clinic duration of every closed consultation
        // (updatedAt - createdAt spans the full visit service clock)
        Appointment.aggregate([
            { $match: { doctor: { $in: ids }, status: 'completed' } },
            { $group: { _id: '$doctor', avgDuration: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } } } }
        ])
    ]);

    const countMap = new Map(workloadRows.map(r => [r._id.toString(), r.count]));
    const rateMap = new Map(rateRows.map(r => [r._id.toString(), r.avgDuration / 60000]));

    const metrics = availableDoctors.map(doc => {
        const id = doc._id.toString();
        return {
            doc,
            match: matchSpecialty(department, doc.department),
            work: countMap.get(id) || 0,
            speed: rateMap.get(id) || 15 // industry-typical 15 min baseline until history exists
        };
    });

    // Min-max normalization over the candidate pool
    const maxWork = Math.max(...metrics.map(m => m.work));
    const speeds = metrics.map(m => m.speed);
    const minSp = Math.min(...speeds), maxSp = Math.max(...speeds);

    return metrics.map(m => {
        const workScore = maxWork ? 1 - m.work / maxWork : 1;                       // fewer active patients -> higher
        const rateScore = maxSp === minSp ? 1 : 1 - (m.speed - minSp) / (maxSp - minSp); // faster average -> higher

        const suitabilityScore = Math.round(100 *
            (WEIGHTS.specialization * m.match +
             WEIGHTS.workload * workScore +
             WEIGHTS.serviceRate * rateScore) * 10) / 10;

        return {
            doctor: m.doc,
            suitabilityScore,
            scoreBreakdown: {
                specialization: Math.round(m.match * 100) / 100,
                workload: Math.round(workScore * 100) / 100,
                serviceRate: Math.round(rateScore * 100) / 100
            },
            activeQueue: m.work,
            avgServiceMinutes: Math.round(m.speed)
        };
    }).sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}

module.exports = { calculateDoctorScores };
