const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { initializeDatabase } = require('./database/db');
const { extendDatabase } = require('./database/extend_db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

initializeDatabase();
extendDatabase();

// Core
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Academic
app.use('/api/students', require('./routes/students'));
app.use('/api/faculty', require('./routes/faculty'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/examinations', require('./routes/examinations'));
app.use('/api/exams', require('./routes/exams_enhanced'));
app.use('/api/lms', require('./routes/lms'));
app.use('/api/obe', require('./routes/obe'));

// Finance
app.use('/api/fees', require('./routes/fees'));

// Library
app.use('/api/library', require('./routes/library'));

// Placements
app.use('/api/placements', require('./routes/placements'));

// Placement Management System v2
app.use('/api/companies', require('./routes/companies'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/assessments', require('./routes/assessments'));
app.use('/api/student-placement', require('./routes/student_placement'));

// Communication
app.use('/api/notices', require('./routes/notices'));
app.use('/api/feed', require('./routes/feed'));
app.use('/api/calendar', require('./routes/calendar'));

// Global Search
app.use('/api/search', require('./routes/search'));

// HR & Staff
app.use('/api/hr', require('./routes/hr'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/staff-attendance', require('./routes/staff_attendance'));

// Campus Services
app.use('/api/helpdesk', require('./routes/helpdesk'));
app.use('/api/infrastructure', require('./routes/infrastructure'));
app.use('/api/hostel', require('./routes/hostel'));

// Admissions
app.use('/api/admissions', require('./routes/admissions'));

// Drive
app.use('/api/drive', require('./routes/drive'));

// Mentor-Mentee
app.use('/api/mentor', require('./routes/mentor'));

// Feedback / IQAC
app.use('/api/feedback', require('./routes/feedback'));

// Parents
app.use('/api/parents', require('./routes/parents'));

// Structure / Core Data
app.use('/api/structure', require('./routes/structure'));

// Timetable
app.use('/api/timetable', require('./routes/timetable'));

// Analytics
app.use('/api/analytics', require('./routes/analytics'));

// Reports
app.use('/api/reports', require('./routes/reports'));

// AI Intelligence Agents (continuous monitoring)
app.use('/api/agents', require('./routes/agents'));

// ── SAP-grade future-proof modules ──────────────────────────────────────────
// Workflow / Process Hub (Bright Process — SAP Workflow equivalent)
app.use('/api/workflow', require('./routes/workflow'));

// Finance Management (SAP FI equivalent)
app.use('/api/finance', require('./routes/finance'));

// Procurement / Materials Management (SAP MM equivalent)
app.use('/api/procurement', require('./routes/procurement'));

// Alumni Relations (SAP CRM equivalent)
app.use('/api/alumni', require('./routes/alumni'));

// Accreditation & Quality Management (NAAC / SAP QM equivalent)
app.use('/api/accreditation', require('./routes/accreditation'));

// ── Global B-School Grade Modules ────────────────────────────────────────────
// Research Management (publications, grants, patents, consultancy, PhD supervision)
app.use('/api/research', require('./routes/research'));

// Faculty Development Programs
app.use('/api/fdp', require('./routes/fdp'));

// Rankings & Accreditation Metrics (NIRF, QS, AACSB, EQUIS, FT)
app.use('/api/rankings', require('./routes/rankings'));

// Corporate Relations & Industry Connect (MOUs, guest lectures, advisory board)
app.use('/api/corporate-relations', require('./routes/corporate_relations'));

// Phase 3-7 new modules
app.use('/api/curriculum', require('./routes/curriculum'));
app.use('/api/cms', require('./routes/cms'));
app.use('/api/notification-templates', require('./routes/notification_templates'));
app.use('/api/venues', require('./routes/venues'));
app.use('/api/audience', require('./routes/audience'));
app.use('/api/institution', require('./routes/institution'));

// Roles & Privileges management
app.use('/api/roles', require('./routes/roles'));

// Vision 2036 AI Brain — Intelligence Engine
app.use('/api/ai', require('./routes/ai_brain'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString(), name: 'MSRIM Digital Campus ERP', version: '3.0', modules: 52 }));

// Serve built React frontend (production mode — run BUILD-FRONTEND.bat first)
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║       MSRIM Digital Campus ERP v3.0 - Running        ║
║       Backend: http://localhost:${PORT}                   ║
║       Modules: 30+ | Roles: 9 | Features: 150+       ║
╚══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
