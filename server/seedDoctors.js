// Standalone terminal seed: node seedDoctors.js
// Creates backend login accounts (role = doctor) for every Medical Staff profile in the
// Doctor collection, so staff appear under User Roles and can log in without manual signup.
// Idempotent: re-running updates existing accounts instead of duplicating them.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Doctor = require('./models/Doctor');
const User = require('./models/User');

// Matches the dedicated staff credentials used by the Medical Staff seeder
const DEFAULT_PASSWORD = 'PrimeCare@2026';

const seedDoctorAccounts = async () => {
    try {
        if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing in server/.env');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB — synchronizing Medical Staff login accounts...');

        const doctors = (await Doctor.find().select('name email').lean())
            .filter(d => d.email && d.name);
        if (!doctors.length) {
            console.log('No Medical Staff profiles found. Run the doctor seeder first.');
            await mongoose.disconnect();
            return process.exit(0);
        }

        const hashed = await bcrypt.hash(DEFAULT_PASSWORD, await bcrypt.genSalt(10));
        const ops = doctors.map(d => ({
            updateOne: {
                filter: { email: d.email.toLowerCase() },
                update: {
                    $set: {
                        name: d.name,
                        email: d.email.toLowerCase(),
                        password: hashed,
                        role: 'doctor',
                        isVerified: true,
                        otp: null,
                        otpExpires: null
                    }
                },
                upsert: true
            }
        }));

        const result = await User.bulkWrite(ops, { ordered: false });
        console.log(`Done. created=${result.upsertedCount} updated=${result.modifiedCount} of ${doctors.length} Medical Staff profiles.`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Doctor account seeding failed:', err.message);
        process.exit(1);
    }
};

seedDoctorAccounts();
