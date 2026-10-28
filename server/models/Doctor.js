const mongoose = require('mongoose');
const { validateDoctorSpecialty } = require('../utils/specialtyValidator');
const { parseTimeToMinutes, getShiftDurationMinutes } = require('../utils/slotGenerator');

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const staffSchema = new mongoose.Schema({
    // Links the auth record to its clinical profile; sparse keeps seeded staff valid.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: 'PrimeCare@2026' }, // Dedicated doctor auth credentials
    roleType: { type: String, enum: ['doctor', 'nurse', 'specialist', 'surgeon'], default: 'doctor' },
    department: {
        type: String,
        enum: [
            'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
            'Emergency & Trauma', 'General Medicine', 'Oncology',
            'Obstetrics & Gynecology', 'Radiology', 'Pulmonology',
            'Dermatology', 'Ophthalmology', 'ENT', 'Psychiatry', 'ICU'
        ],
        default: 'General Medicine',
        required: true
    },
    qualification: { type: String, default: 'MBBS', required: true },
    // Professional registry details (admin-managed)
    age: { type: Number, min: 24, max: 90 },
    degree: { type: String, default: 'MBBS, MD' },  // specialty-clinical degree, cross-validated against department
    college: { type: String, default: '' },          // teaching-hospital alma mater
    awards: { type: [String], default: [] },         // clinical excellence / institutional recognitions
    experienceYears: { type: Number, default: 0, required: true },
    consultationFee: { type: Number, default: 1000, required: true },
    rating: { type: Number, default: 4.9 },
    presenceStatus: { type: String, enum: ['available', 'busy', 'on-break', 'absent'], default: 'available' },
    // Canonical weekly OPD schedule stored as 12-hour display strings.
    days: {
        type: [String],
        enum: DAY_NAMES,
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    workingHours: {
        start: {
            type: String,
            default: '09:00 AM',
            validate: {
                validator: (value) => parseTimeToMinutes(value) !== null,
                message: 'Working hours start must be a valid time.'
            }
        },
        end: {
            type: String,
            default: '05:00 PM',
            validate: {
                validator: (value) => parseTimeToMinutes(value) !== null,
                message: 'Working hours end must be a valid time.'
            }
        }
    },
    avatar: { type: String } // Initials badge placeholder (no external image services)
}, { timestamps: true });

// Qualification versus department guarantee: runs on document saves such as admin
// doctor creation/edit, so a mismatched profile can never persist.
// Mongoose 9 hooks are promise-based and no longer pass `next`; calling next() here
// was the source of "next is not a function" during doctor.save().
staffSchema.pre('save', function () {
    validateDoctorSpecialty(this);

    // Overnight windows pass because duration is computed across midnight.
    if (getShiftDurationMinutes(this.workingHours?.start, this.workingHours?.end) === 0) {
        throw new Error('Working hours must contain valid, different start and end times.');
    }
});

module.exports = mongoose.model('Doctor', staffSchema);
