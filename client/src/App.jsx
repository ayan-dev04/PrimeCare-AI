import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AboutUs from './pages/AboutUs';
import Doctors from './pages/Doctors';
import DepartmentDetail from './pages/DepartmentDetail';
import BookAppointment from './pages/BookAppointment';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import VideoRoom from './pages/VideoRoom';
import PrimeAIChat from './components/PrimeAIChat';

export default function App() {
    return (
        <Router>
            <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
                {/* Global Navigation Bar */}
                <Navbar />

                {/* Main Route Views */}
                <main className="flex-grow">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/about" element={<AboutUs />} />
                        <Route path="/doctors" element={<Doctors />} />
                        <Route path="/departments/:deptName" element={<DepartmentDetail />} />
                        <Route path="/book-appointment" element={<BookAppointment />} />
                        <Route path="/patient-dashboard" element={<PatientDashboard />} />
                        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
                        <Route path="/admin-dashboard" element={<AdminDashboard />} />
                        <Route path="/video-consultation" element={<VideoRoom />} />
                    </Routes>
                </main>

                {/* Floating PrimeAI Assistant Widget */}
                <PrimeAIChat />
            </div>
        </Router>
    );
}