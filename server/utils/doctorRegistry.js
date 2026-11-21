/* ── Hospital Professional Registry ──
   Medanta-style per-department credential data: every degree string is written so
   its specialty tokens (cardiolog, neurolog, derm, ...) unambiguously belong to
   its own department. Shared by the terminal seeder and the controller's
   self-healing reseed so both paths generate department-aligned data. */

const DEPT_PROFILES = {
    'Cardiology': {
        hod: { name: 'Dr. Aakarsh Khanna (HOD)', degree: 'MBBS, MS, MCh - Cardiothoracic Surgery, AIIMS New Delhi' },
        degrees: [
            'MBBS, MD - General Medicine, DM - Cardiology',
            'MBBS, MD, DNB - Cardiology',
            'MBBS, MS, MCh - Cardiothoracic Surgery'
        ],
        awards: [
            'Excellence in Clinical Cardiology 2024',
            'Best Interventional Cardiologist Award - Cardiological Society of India',
            'Fellow of the Indian College of Cardiology'
        ]
    },
    'Neurology': {
        hod: { name: 'Dr. Alok Malhotra (HOD)', degree: 'MBBS, MD, DM - Chief Neurologist, NIMHANS Bengaluru' },
        degrees: [
            'MBBS, MD - Medicine, DM - Neurology',
            'MBBS, MD, DNB - Neurology',
            'MBBS, MS, MCh - Neurosurgery'
        ],
        awards: [
            'Best Neurologist Award - Indian Academy of Neurology 2023',
            'Excellence in Stroke Care & Research 2024',
            'Young Neuroscientist Recognition'
        ]
    },
    'Orthopedics': {
        hod: { name: 'Dr. Ramesh Gupta (HOD)', degree: 'MBBS, MS - Orthopedic Surgery, PGI Chandigarh' },
        degrees: [
            'MBBS, MS - Orthopedics',
            'MBBS, DNB - Orthopedic Surgery, Fellowship in Joint Replacement',
            'MBBS, MS - Orthopedics, Fellowship in Spine Surgery'
        ],
        awards: [
            'Best Joint Replacement Surgeon Award 2024',
            'Excellence in Sports Injury Management',
            'Indian Orthopedic Association Merit Award'
        ]
    },
    'Pediatrics': {
        hod: { name: 'Dr. Suresh Verma (HOD)', degree: 'MBBS, MD - Pediatrics, Kalawati Saran Children Hospital' },
        degrees: [
            'MBBS, MD - Pediatrics',
            'MBBS, DCH, MD - Pediatrics',
            'MBBS, DNB - Pediatrics, Fellowship in Neonatology'
        ],
        awards: [
            'Excellence in Child Healthcare 2024',
            'Best Neonatal Intensive Care Award',
            'Indian Academy of Pediatrics Merit Award'
        ]
    },
    'Emergency & Trauma': {
        hod: { name: 'Dr. Vikram Deshmukh (HOD)', degree: 'MBBS, MS - Trauma & Critical Care, AIIMS Trauma Center' },
        degrees: [
            'MBBS, MD - Emergency Medicine',
            'MBBS, MD - Anaesthesiology, Fellowship in Critical Care',
            'MBBS, MS - General Surgery, Fellowship in Trauma Care'
        ],
        awards: [
            'Emergency Response Excellence Award 2023',
            'Best Critical Care Unit Shield',
            'National Disaster Response Commendation'
        ]
    },
    'Oncology': {
        hod: { name: 'Dr. Anil Kapoor (HOD)', degree: 'MBBS, MD, DM - Medical Oncology, Tata Memorial Centre' },
        degrees: [
            'MBBS, MD - Internal Medicine, DM - Medical Oncology',
            'MBBS, MS - Surgical Oncology',
            'MBBS, MD, DNB - Radiation Oncology'
        ],
        awards: [
            'Oncology Excellence Award - Indian Cancer Society 2024',
            'Best Research Paper in Cancer Therapeutics',
            'ECMO & Radiation Safety Certification Recognition'
        ]
    },
    'Dermatology': {
        hod: { name: 'Dr. Manoj Joshi (HOD)', degree: 'MBBS, MD - Dermatology, Venereology & Leprosy, KGMU Lucknow' },
        degrees: [
            'MBBS, MD - Dermatology, Venereology & Leprosy',
            'MBBS, DVD - Dermatology',
            'MBBS, DNB - Dermatology'
        ],
        awards: [
            'Best Clinical Dermatologist Award 2024',
            'Excellence in Cosmetic Dermatology Research',
            'Indian Association of Dermatologists Fellowship'
        ]
    },
    'General Medicine': {
        hod: { name: 'Dr. Rakesh Sen (HOD)', degree: 'MBBS, MD - General Medicine, Maulana Azad Medical College' },
        degrees: [
            'MBBS, MD - General Medicine',
            'MBBS, MD - Internal Medicine',
            'MBBS, DNB - Family Medicine'
        ],
        awards: [
            'Community Healthcare Excellence Award 2023',
            'Excellence in Diabetic Care Management',
            'Indian Medical Association Merit Award'
        ]
    }
};

// Recognized teaching-hospital alma maters (registry realism)
const COLLEGES = [
    'AIIMS New Delhi',
    'PGIMER Chandigarh',
    'CMC Vellore',
    'King George\'s Medical University, Lucknow',
    'Maulana Azad Medical College, Delhi',
    'Armed Forces Medical College, Pune',
    'Seth GS Medical College, Mumbai',
    'JIPMER Puducherry',
    'Madras Medical College, Chennai',
    'CMC Ludhiana'
];

// Generic institutional recognitions mixed into department awards
const GENERAL_AWARDS = [
    'Gold Medal for Academic Excellence',
    'Healthcare Excellence Award 2023',
    'Times Health Icon Award 2024',
    'Best Paper Presentation - National Medical Conference'
];

module.exports = { DEPT_PROFILES, COLLEGES, GENERAL_AWARDS };
