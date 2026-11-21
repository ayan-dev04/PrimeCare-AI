const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const { DEPT_PROFILES, COLLEGES, GENERAL_AWARDS } = require('../utils/doctorRegistry');
require('dotenv').config();

// Deterministic pick helper keeps seeded profiles varied but registry-compliant
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Seeded emails must satisfy the controller's self-healing check
// (plus-addressed format with the official hospital mailbox domain)
const generateDoctorEmail = (doctorName, baseEmail = process.env.EMAIL_USER || 'primecare.hospital@gmail.com') => {
    const cleanName = doctorName.toLowerCase().replace(/dr\./g, '').replace(/\(hod\)/g, '').trim().replace(/[^a-z0-9]/g, '');
    const [username, domain] = baseEmail.split('@');
    return `${username}+${cleanName}@${domain}`;
};

const initialsOf = (name) => {
    const parts = name.replace(/dr\.|\(hod\)/gi, '').trim().split(/\s+/);
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
};

// Collision-proof alias wrapper: prevents two doctors from sharing one email
// (name-pool collisions would otherwise make writes hit the twin doc's
// unique email_1 index entry with an E11000)
const uniqueDoctorEmail = (name, usedEmails) => {
    let email = generateDoctorEmail(name);
    for (let n = 2; usedEmails.has(email); n++) {
        email = generateDoctorEmail(`${name} ${n}`);
    }
    usedEmails.add(email);
    return email;
};

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for department registry seeding...');

        await Doctor.deleteMany();

        const maleFirstNames = ['Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Kabir', 'Rohan', 'Amit', 'Rahul', 'Siddharth', 'Manish', 'Karan', 'Varun', 'Nikhil', 'Sameer', 'Harsh'];
        const femaleFirstNames = ['Ananya', 'Diya', 'Saanvi', 'Riya', 'Meera', 'Pooja', 'Neha', 'Priya', 'Sneha', 'Kavita', 'Tanvi', 'Shruti', 'Divya', 'Swati', 'Sunita'];
        const lastNames = ['Sharma', 'Verma', 'Gupta', 'Malhotra', 'Mehta', 'Bhasin', 'Patel', 'Reddy', 'Iyer', 'Nair', 'Bose', 'Sen', 'Joshi', 'Kulkarni', 'Saxena', 'Kapoor'];
        const fees = [1200, 1500, 1800, 2000];

        let staffList = [];
        let maleIndex = 0, femaleIndex = 0;
        const usedEmails = new Set();

        Object.entries(DEPT_PROFILES).forEach(([dept, profile]) => {
            for (let i = 1; i <= 10; i++) {
                const isHOD = i === 1;
                const isMale = i % 2 === 0;

                const fName = isHOD
                    ? profile.hod.name.split(' ')[1]      // registry HOD surname preserved
                    : isMale ? maleFirstNames[maleIndex++ % maleFirstNames.length]
                             : femaleFirstNames[femaleIndex++ % femaleFirstNames.length];
                const lName = isHOD
                    ? profile.hod.name.split(' ')[2]
                    : pick(lastNames);

                const name = isHOD
                    ? profile.hod.name
                    : `Dr. ${fName} ${lName}`;

                // Degree + college must align with the department (registry rule)
                const degree = isHOD ? profile.hod.degree : pick(profile.degrees);
                const college = isHOD ? (degree.match(/,\s*([A-Z].+)$/)?.[1] || pick(COLLEGES)) : pick(COLLEGES);

                const experience = isHOD ? Math.floor(Math.random() * 6) + 20 : Math.floor(Math.random() * 12) + 5;
                // Working clinicians: HODs career-final-stage, juniors practising age-band
                const age = experience + (isHOD ? Math.floor(Math.random() * 6) + 25 : Math.floor(Math.random() * 5) + 24);

                // 1-2 recognitions: one department-specific + optionally one general
                const awards = [pick(profile.awards)];
                if (Math.random() > 0.5) awards.push(pick(GENERAL_AWARDS));

                staffList.push({
                    name,
                    email: uniqueDoctorEmail(name, usedEmails),
                    password: 'PrimeCare@2026',
                    roleType: isHOD ? 'specialist' : (i % 3 === 0 ? 'surgeon' : 'doctor'),
                    department: dept,
                    qualification: degree.split(',')[0] + (degree.includes('-') ? ` - ${degree.split('-')[1]?.trim()}` : ''),
                    degree,
                    college,
                    age,
                    awards,
                    experienceYears: experience,
                    consultationFee: isHOD ? 2500 : pick(fees),
                    rating: isHOD ? (4.90 + Math.random() * 0.1).toFixed(2) : (4.70 + Math.random() * 0.2).toFixed(2),
                    presenceStatus: ['available', 'available', 'available', 'busy', 'on-break'][Math.floor(Math.random() * 5)],
                    avatar: initialsOf(name)
                });
            }
        });

        await Doctor.insertMany(staffList);
        console.log(`Successfully seeded ${staffList.length} registry-aligned doctors with degrees, colleges, awards & ages!`);
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedDB();
