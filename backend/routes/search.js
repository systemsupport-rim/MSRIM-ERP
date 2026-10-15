const express = require('express');
const { db } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { q } = req.query;
  const role = req.user.role;
  if (!q || q.trim().length < 2) return res.json([]);
  const like = `%${q.trim()}%`;
  const results = [];

  try {
    // Students (admin, hod, registrar, faculty)
    if (['admin','registrar','hod','faculty'].includes(role)) {
      const students = db.prepare(`
        SELECT u.name, s.enrollment_number, s.section, p.name as program
        FROM students s JOIN users u ON s.user_id=u.id JOIN programs p ON s.program_id=p.id
        WHERE (u.name LIKE ? OR s.enrollment_number LIKE ? OR u.email LIKE ?)
        AND s.status='active' LIMIT 6
      `).all(like, like, like);
      students.forEach(s => results.push({
        type: 'student',
        title: s.name,
        subtitle: `${s.enrollment_number} · ${s.program} · Sec ${s.section}`,
        path: '/students'
      }));
    }

    // Faculty
    if (['admin','registrar','hod'].includes(role)) {
      const faculty = db.prepare(`
        SELECT u.name, f.designation, d.name as dept
        FROM faculty f JOIN users u ON f.user_id=u.id LEFT JOIN departments d ON f.department_id=d.id
        WHERE (u.name LIKE ? OR f.employee_id LIKE ? OR u.email LIKE ?) AND u.is_active=1 LIMIT 5
      `).all(like, like, like);
      faculty.forEach(f => results.push({
        type: 'faculty',
        title: f.name,
        subtitle: `${f.designation || 'Faculty'} · ${f.dept || ''}`,
        path: '/faculty'
      }));
    }

    // Administration staff
    if (['admin','registrar','hod'].includes(role)) {
      const staff = db.prepare(`
        SELECT name, role, department FROM users
        WHERE (name LIKE ? OR username LIKE ? OR email LIKE ?)
        AND role NOT IN ('student','faculty') AND is_active=1 LIMIT 5
      `).all(like, like, like);
      staff.forEach(s => results.push({
        type: 'staff',
        title: s.name,
        subtitle: `${s.role} · ${s.department || ''}`,
        path: '/faculty'
      }));
    }

    // Notices
    const notices = db.prepare(`
      SELECT title, category, created_at FROM notices
      WHERE (title LIKE ? OR content LIKE ?) ORDER BY created_at DESC LIMIT 4
    `).all(like, like);
    notices.forEach(n => results.push({
      type: 'notice',
      title: n.title,
      subtitle: `${n.category} · ${new Date(n.created_at).toLocaleDateString('en-IN')}`,
      path: '/notices'
    }));

    // Courses
    const courses = db.prepare(`
      SELECT c.name, c.code, p.name as program FROM courses c JOIN programs p ON c.program_id=p.id
      WHERE (c.name LIKE ? OR c.code LIKE ?) LIMIT 4
    `).all(like, like);
    courses.forEach(c => results.push({
      type: 'course',
      title: `${c.name}`,
      subtitle: `${c.code} · ${c.program}`,
      path: '/courses'
    }));

    // Placements
    const placements = db.prepare(`
      SELECT company_name, job_role, status FROM placements
      WHERE (company_name LIKE ? OR job_role LIKE ?) LIMIT 4
    `).all(like, like);
    placements.forEach(p => results.push({
      type: 'placement',
      title: p.company_name,
      subtitle: `${p.job_role} · ${p.status}`,
      path: '/placements'
    }));

    // Library books
    const books = db.prepare(`
      SELECT title, author FROM library_books
      WHERE (title LIKE ? OR author LIKE ? OR isbn LIKE ?) LIMIT 4
    `).all(like, like, like);
    books.forEach(b => results.push({
      type: 'library',
      title: b.title,
      subtitle: `by ${b.author}`,
      path: '/library'
    }));

    // Module/page search — search module names from all groups
    const modules = [
      { label: 'Students',        path: '/students' },
      { label: 'Faculty',         path: '/faculty' },
      { label: 'Administration Staff', path: '/faculty' },
      { label: 'Courses',         path: '/courses' },
      { label: 'Attendance',      path: '/attendance' },
      { label: 'Timetable',       path: '/timetable' },
      { label: 'LMS',             path: '/lms' },
      { label: 'OBE / Outcomes',  path: '/obe' },
      { label: 'Mentor-Mentee',   path: '/mentor' },
      { label: 'Examinations',    path: '/examinations' },
      { label: 'Hall Tickets',    path: '/exams/hall-tickets' },
      { label: 'Fee Management',  path: '/fees' },
      { label: 'Admissions',      path: '/admissions' },
      { label: 'HR Management',   path: '/hr' },
      { label: 'Leave Management',path: '/leave-management' },
      { label: 'Staff Attendance',path: '/staff-attendance' },
      { label: 'Library',         path: '/library' },
      { label: 'Placements',      path: '/placements' },
      { label: 'Hostel',          path: '/hostel' },
      { label: 'Infrastructure',  path: '/infrastructure' },
      { label: 'Helpdesk',        path: '/helpdesk' },
      { label: 'Feedback',        path: '/feedback' },
      { label: 'Notices',         path: '/notices' },
      { label: 'Calendar',        path: '/calendar' },
      { label: 'Drive',           path: '/drive' },
      { label: 'Workflow',        path: '/workflow' },
      { label: 'Finance & Budget',path: '/finance' },
      { label: 'Procurement',     path: '/procurement' },
      { label: 'Alumni',          path: '/alumni' },
      { label: 'Accreditation',   path: '/accreditation' },
      { label: 'AI Intelligence', path: '/intelligence' },
      { label: 'Analytics',       path: '/analytics' },
      { label: 'Reports',         path: '/reports' },
      { label: 'Roles & Privileges', path: '/roles' },
      { label: 'Admin Privileges',path: '/admin-privileges' },
      { label: 'Admin Console',   path: '/admin-console' },
      { label: 'Structure',       path: '/structure' },
    ];
    const qLower = q.toLowerCase();
    modules.filter(m => m.label.toLowerCase().includes(qLower)).slice(0, 4).forEach(m => results.push({
      type: 'module',
      title: m.label,
      subtitle: 'Go to module',
      path: m.path
    }));

    res.json(results.slice(0, 20));
  } catch (e) {
    console.error('Search error:', e.message);
    res.json([]);
  }
});

module.exports = router;
