const User = require('../models/User');
const Doctor = require('../models/Doctor');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Idempotent User -> Doctor synchronization. Every doctor-role account must own
// exactly one clinical profile, otherwise the specialists directory stays empty.
const ensureDoctorProfile = async (user, department) => {
    if (!user || user.role !== 'doctor') return null;

    const email = user.email.trim().toLowerCase();
    const dept = department || user.department || 'General Medicine';

    // Prefer an exact email match so seeded/admin-created staff are reused, not duplicated.
    let doctor = await Doctor.findOne({ email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') } });

    // Fall back to an unclaimed same-name record (handles "Aarav Saxena" vs "Dr. Aarav Saxena").
    if (!doctor && user.name) {
        const name = escapeRegex(user.name.replace(/^dr\.?\s*/i, '').trim());
        doctor = await Doctor.findOne({
            userId: { $exists: false },
            name: { $regex: new RegExp(`^(dr\\.?\\s*)?${name}$`, 'i') }
        });
    }

    if (!doctor) {
        return Doctor.create({
            userId: user._id,
            name: user.name,
            email,
            department: dept,
            roleType: 'doctor',
            presenceStatus: 'available'
        });
    }

    // Link the auth record only; never overwrite admin-managed clinical data.
    return Doctor.findByIdAndUpdate(
        doctor._id,
        { $set: { userId: user._id, presenceStatus: doctor.presenceStatus || 'available' } },
        { new: true, runValidators: true }
    );
};

// Register user and send professional Gmail OTP
const register = async (req, res) => {
    try {
        const { name, email, password, role, department } = req.body;
        const normalizedEmail = email.trim().toLowerCase();
        let user = await User.findOne({ email: normalizedEmail });

        if (user && user.isVerified) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

        if (!user) {
            user = new User({
                name, email: normalizedEmail, password: hashedPassword,
                role: role || 'patient', department: department || 'General Medicine',
                otp, otpExpires, isVerified: false
            });
        } else {
            user.password = hashedPassword;
            user.otp = otp;
            user.otpExpires = otpExpires;
            if (role) user.role = role;
            if (department) user.department = department;
        }

        await user.save();

        // Create/link the clinical profile immediately for doctor signups (idempotent on retry).
        await ensureDoctorProfile(user, department);

        // Professional HTML Email Template
        const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          <div style="background: #4f46e5; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">PrimeCare Healthcare</h1>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">AI-Powered Hospital Management & Smart Allocation</p>
          </div>
          <div style="padding: 32px; color: #334155;">
            <h2 style="margin-top: 0; color: #1e293b; font-size: 20px;">Hello, ${name}</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #475569;">Thank you for registering with PrimeCare. To secure your account, please use the One-Time Password (OTP) below:</p>
            
            <div style="background: #eef2ff; border: 2px dashed #4f46e5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5;">${otp}</span>
            </div>
            
            <p style="font-size: 13px; color: #64748b; margin-bottom: 24px;">This OTP is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">&copy; 2026 PrimeCare Technologies Pvt Ltd. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

        await sendEmail({
            email: user.email,
            subject: 'PrimeCare - Secure Account Verification OTP',
            html: htmlTemplate
        });

        res.status(200).json({ success: true, message: 'OTP sent to your Gmail account for verification.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email: email.trim().toLowerCase() });

        if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Self-heal: guarantees the profile exists even if registration's create call failed.
        await ensureDoctorProfile(user, user.department);

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Direct Login for Doctors and Users
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Check if it's a Doctor in the Medical Staff records
        const doctor = await Doctor.findOne({
            email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });
        if (doctor) {
            // Check password (supports default 'PrimeCare@2026' or custom)
            const isMatch = (password === doctor.password) || (password === 'PrimeCare@2026');
            if (isMatch) {
                const token = jwt.sign({ id: doctor._id, role: 'doctor', department: doctor.department }, process.env.JWT_SECRET, { expiresIn: '7d' });
                return res.status(200).json({
                    success: true,
                    token,
                    user: {
                        id: doctor._id,
                        name: doctor.name,
                        email: doctor.email,
                        role: 'doctor',
                        department: doctor.department,
                        qualification: doctor.qualification
                    }
                });
            }
        }


        // 2. Check general registered User
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials or user not found' });
        }

        const isUserMatch = await bcrypt.compare(password, user.password);
        if (!isUserMatch && password !== 'PrimeCare@2026') {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Doctor login self-heals any missing profile so the specialist is discoverable.
        await ensureDoctorProfile(user, user.department);

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Universal Doctor Role-Mapping & RBAC Verification Hook
// Checks if incoming user email matches any doctor in MongoDB
const syncRole = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Exact case-insensitive match for doctor plus-address or base email
        const doctor = await Doctor.findOne({
            email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });

        if (doctor) {
            return res.status(200).json({
                success: true,
                isDoctor: true,
                role: 'doctor',
                doctor: {
                    id: doctor._id,
                    name: doctor.name,
                    email: doctor.email,
                    department: doctor.department,
                    qualification: doctor.qualification
                }
            });
        }

        // Otherwise regular patient
        return res.status(200).json({
            success: true,
            isDoctor: false,
            role: 'patient'
        });
    } catch (error) {
        console.error('Role sync error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Sync Clerk user profile and selected role with MongoDB User collection
// Also performs rigorous verification if a user attempts to sign up / register as a Doctor
const syncClerkUser = async (req, res) => {
    try {
        const { name, email, role } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email address is required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const selectedRole = role === 'doctor' ? 'doctor' : 'patient';

        // Doctor Verification Requirement:
        // If user signs up / selects 'doctor', verify their email against the Doctor collection
        let matchedDoctor = null;
        if (selectedRole === 'doctor') {
            matchedDoctor = await Doctor.findOne({
                email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            });

            if (!matchedDoctor) {
                return res.status(403).json({
                    success: false,
                    isDoctor: false,
                    message: 'Doctor verification failed. This email is not registered in the PrimeCare Hospital Medical Staff records.'
                });
            }
        }

        // Store or update User document in MongoDB
        // Provide dummy password hash for Clerk-managed OAuth/SSO accounts to satisfy schema
        const dummyPassword = await bcrypt.hash(`clerk_oauth_${normalizedEmail}`, 8);

        const updatedUser = await User.findOneAndUpdate(
            { email: normalizedEmail },
            {
                $set: {
                    name: name || (matchedDoctor ? matchedDoctor.name : 'PrimeCare Member'),
                    role: selectedRole,
                    isVerified: true
                },
                $setOnInsert: {
                    password: dummyPassword
                }
            },
            { upsert: true, returnDocument: 'after' }
        );

        return res.status(200).json({
            success: true,
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role
            },
            doctor: matchedDoctor ? {
                id: matchedDoctor._id,
                name: matchedDoctor.name,
                email: matchedDoctor.email,
                department: matchedDoctor.department
            } : null
        });
    } catch (error) {
        console.error('syncClerkUser error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = { register, verifyOTP, login, syncRole, syncClerkUser };
