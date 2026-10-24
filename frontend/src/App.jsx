import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students/Students';
import Faculty from './pages/Faculty/Faculty';
import Staff from './pages/Staff/Staff';
import Courses from './pages/Courses/Courses';
import Attendance from './pages/Attendance/Attendance';
import Examinations from './pages/Examinations/Examinations';
import Fees from './pages/Fees/Fees';
import Library from './pages/Library/Library';
import Placements from './pages/Placements/Placements';
import PlacementPOD from './pages/Placements/PlacementPOD';
import CompanyManagement from './pages/Placements/CompanyManagement';
import JobManagement from './pages/Placements/JobManagement';
import PlacementReports from './pages/Placements/PlacementReports';
import Notices from './pages/Notices/Notices';
import Reports from './pages/Reports/Reports';
import Profile from './pages/Profile';
import CalendarPage from './pages/Calendar/Calendar';
import Drive from './pages/Drive/Drive';
import LMS from './pages/LMS/LMS';
import FeedPage from './pages/Feed/Feed';
import Admissions from './pages/Admissions/Admissions';
import Feedback from './pages/Feedback/Feedback';
import Infrastructure from './pages/Infrastructure/Infrastructure';
import Helpdesk from './pages/Helpdesk/Helpdesk';
import HR from './pages/HR/HR';
import Hostel from './pages/Hostel/Hostel';
import MentorMentee from './pages/Mentor/Mentor';
import Parents from './pages/Parents/Parents';
import Structure from './pages/Structure/Structure';
import Analytics from './pages/Analytics/Analytics';
import OBE from './pages/OBE/OBE';
import OBEDashboard from './pages/OBE/OBEDashboard';
import ExamsEnhanced from './pages/Examinations/ExamsEnhanced';
import RolesPrivileges from './pages/Roles/Roles';
import Timetable from './pages/Timetable/Timetable';
import ClassroomSchedule from './pages/ClassroomSchedule/ClassroomSchedule';
import WorkflowPage from './pages/Workflow/Workflow';
import Finance from './pages/Finance/Finance';
import Procurement from './pages/Procurement/Procurement';
import Alumni from './pages/Alumni/Alumni';
import Accreditation from './pages/Accreditation/Accreditation';
import Intelligence from './pages/Intelligence/Intelligence';
import Intelligence2036 from './pages/Intelligence/Intelligence2036';
import Research from './pages/Research/Research';
import FDP from './pages/FDP/FDP';
import Rankings from './pages/Rankings/Rankings';
import CorporateRelations from './pages/CorporateRelations/CorporateRelations';
import AdminConsole from './pages/AdminConsole/AdminConsole';
import LeaveManagement from './pages/LeaveManagement/LeaveManagement';
import StaffAttendance from './pages/StaffAttendance/StaffAttendance';
import AdminPrivileges from './pages/AdminPrivileges/AdminPrivileges';
import AdmissionEnquiries from './pages/Admissions/AdmissionEnquiries';
import AdmissionApplications from './pages/Admissions/AdmissionApplications';
import AdmissionSettings from './pages/Admissions/AdmissionSettings';
import MarksEntry from './pages/Examinations/MarksEntry';
import BacklogManagement from './pages/Examinations/BacklogManagement';
import YearResults from './pages/Examinations/YearResults';
import ResultDeclaration from './pages/Examinations/ResultDeclaration';
// Phase 3 – HR
import AttendanceV2 from './pages/HR/AttendanceV2';
import HRReports from './pages/HR/HRReports';
import HRMasterData from './pages/HR/HRMasterData';
// Phase 4 – Core Data
import AcademicManagement from './pages/AcademicManagement/AcademicManagement';
import Curriculum from './pages/Curriculum/Curriculum';
import CMS from './pages/CMS/CMS';
import NotificationTemplates from './pages/NotificationTemplates/NotificationTemplates';
// Phase 5 – Campus
import HostelFee from './pages/Hostel/HostelFee';
import VenueAdministration from './pages/Venues/VenueAdministration';
import AttendanceConsole from './pages/Attendance/AttendanceConsole';
import AudienceManagement from './pages/Audience/AudienceManagement';
// Phase 6 – System
import OBESettings from './pages/OBE/OBESettings';
import InstitutionSettings from './pages/Settings/InstitutionSettings';
import SSOConfig from './pages/Settings/SSOConfig';
import BiometricManagement from './pages/Settings/BiometricManagement';
import FeedSettings from './pages/Settings/FeedSettings';
// Phase 7 – Integrations
import Integrations from './pages/Integrations/Integrations';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/notices" element={<Notices />} />
        <Route path="/feed" element={<FeedPage />} />
        {/* Academic */}
        <Route path="/students" element={<Students />} />
        <Route path="/faculty" element={<Faculty />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/classroom-schedule" element={<ClassroomSchedule />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/lms" element={<LMS />} />
        <Route path="/obe" element={<OBEDashboard />} />
        <Route path="/obe/outcomes" element={<OBE />} />
        <Route path="/mentor" element={<MentorMentee />} />
        {/* Examinations */}
        <Route path="/examinations" element={<Examinations />} />
        <Route path="/exams/hall-tickets" element={<ExamsEnhanced tab="hall-tickets" />} />
        <Route path="/exams/question-papers" element={<ExamsEnhanced tab="question-papers" />} />
        <Route path="/exams/seating" element={<ExamsEnhanced tab="seating" />} />
        <Route path="/exams/grading" element={<ExamsEnhanced tab="grading" />} />
        <Route path="/exams/certificates" element={<ExamsEnhanced tab="certificates" />} />
        <Route path="/exams/qp-review" element={<ExamsEnhanced tab="qp-review" />} />
        <Route path="/exams/answer-sheets" element={<ExamsEnhanced tab="answer-sheets" />} />
        <Route path="/exams/marks" element={<ProtectedRoute roles={['admin','registrar','faculty','hod']}><MarksEntry /></ProtectedRoute>} />
        <Route path="/exams/backlogs" element={<ProtectedRoute roles={['admin','registrar','faculty','hod']}><BacklogManagement /></ProtectedRoute>} />
        <Route path="/exams/year-results" element={<YearResults />} />
        <Route path="/exams/result-declaration" element={<ProtectedRoute roles={['admin','registrar','hod']}><ResultDeclaration /></ProtectedRoute>} />
        {/* Finance */}
        <Route path="/fees" element={<Fees />} />
        {/* Admissions */}
        <Route path="/admissions" element={<ProtectedRoute roles={['admin','registrar','hod']}><Admissions /></ProtectedRoute>} />
        <Route path="/admissions/enquiries" element={<ProtectedRoute roles={['admin','registrar','hod']}><AdmissionEnquiries /></ProtectedRoute>} />
        <Route path="/admissions/applications" element={<ProtectedRoute roles={['admin','registrar','hod']}><AdmissionApplications /></ProtectedRoute>} />
        <Route path="/admissions/settings" element={<ProtectedRoute roles={['admin','registrar']}><AdmissionSettings /></ProtectedRoute>} />
        {/* Campus */}
        <Route path="/library" element={<Library />} />
        <Route path="/placements" element={<Placements />} />
        <Route path="/placements/pod" element={<PlacementPOD />} />
        <Route path="/placements/companies" element={<CompanyManagement />} />
        <Route path="/placements/jobs" element={<JobManagement />} />
        <Route path="/placements/reports" element={<PlacementReports />} />
        <Route path="/hostel" element={<Hostel />} />
        <Route path="/infrastructure" element={<Infrastructure />} />
        <Route path="/helpdesk" element={<Helpdesk />} />
        <Route path="/feedback" element={<Feedback />} />
        {/* HR */}
        <Route path="/hr" element={<HR />} />
        <Route path="/hr/leaves" element={<HR defaultTab="leaves" />} />
        <Route path="/hr/portfolios" element={<HR defaultTab="portfolios" />} />
        {/* Admin */}
        <Route path="/drive" element={<Drive />} />
        <Route path="/parents" element={<ProtectedRoute roles={['admin','registrar']}><Parents /></ProtectedRoute>} />
        <Route path="/structure" element={<ProtectedRoute roles={['admin','registrar','hod']}><Structure /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute roles={['admin','registrar','hod']}><Analytics /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['admin','registrar','hod']}><Reports /></ProtectedRoute>} />
        <Route path="/roles" element={<ProtectedRoute roles={['admin']}><RolesPrivileges /></ProtectedRoute>} />
        {/* SAP-grade future-proof modules */}
        <Route path="/workflow" element={<WorkflowPage />} />
        <Route path="/finance" element={<ProtectedRoute roles={['admin','accounts','registrar','hod']}><Finance /></ProtectedRoute>} />
        <Route path="/procurement" element={<ProtectedRoute roles={['admin','accounts','registrar','hod','faculty']}><Procurement /></ProtectedRoute>} />
        <Route path="/alumni" element={<Alumni />} />
        <Route path="/accreditation" element={<ProtectedRoute roles={['admin','registrar','hod']}><Accreditation /></ProtectedRoute>} />
        <Route path="/research" element={<ProtectedRoute roles={['admin','registrar','hod','faculty']}><Research /></ProtectedRoute>} />
        <Route path="/fdp" element={<ProtectedRoute roles={['admin','registrar','hod','faculty','staff','accounts','librarian','placement']}><FDP /></ProtectedRoute>} />
        <Route path="/rankings" element={<ProtectedRoute roles={['admin','registrar','hod']}><Rankings /></ProtectedRoute>} />
        <Route path="/corporate-relations" element={<ProtectedRoute roles={['admin','registrar','hod','placement']}><CorporateRelations /></ProtectedRoute>} />
        <Route path="/intelligence" element={<ProtectedRoute roles={['admin','registrar','hod','faculty']}><Intelligence /></ProtectedRoute>} />
        <Route path="/intelligence-2036" element={<ProtectedRoute roles={['admin','registrar','hod','faculty','student']}><Intelligence2036 /></ProtectedRoute>} />
        <Route path="/admin-console" element={<AdminConsole />} />
        <Route path="/leave-management" element={<LeaveManagement />} />
        <Route path="/staff-attendance" element={<StaffAttendance />} />
        <Route path="/admin-privileges" element={<ProtectedRoute roles={['admin']}><AdminPrivileges /></ProtectedRoute>} />
        {/* Phase 3 – HR */}
        <Route path="/hr/attendance-v2" element={<ProtectedRoute roles={['admin','registrar','hod']}><AttendanceV2 /></ProtectedRoute>} />
        <Route path="/hr/reports" element={<ProtectedRoute roles={['admin','registrar','hod']}><HRReports /></ProtectedRoute>} />
        <Route path="/hr/master-data" element={<ProtectedRoute roles={['admin','registrar']}><HRMasterData /></ProtectedRoute>} />
        {/* Phase 4 – Core Data */}
        <Route path="/academic-management" element={<ProtectedRoute roles={['admin','registrar','hod']}><AcademicManagement /></ProtectedRoute>} />
        <Route path="/curriculum" element={<ProtectedRoute roles={['admin','registrar','hod','faculty']}><Curriculum /></ProtectedRoute>} />
        <Route path="/cms" element={<ProtectedRoute roles={['admin','registrar']}><CMS /></ProtectedRoute>} />
        <Route path="/notification-templates" element={<ProtectedRoute roles={['admin','registrar']}><NotificationTemplates /></ProtectedRoute>} />
        {/* Phase 5 – Campus */}
        <Route path="/hostel/fee" element={<ProtectedRoute roles={['admin','registrar','accounts']}><HostelFee /></ProtectedRoute>} />
        <Route path="/venues" element={<VenueAdministration />} />
        <Route path="/attendance-console" element={<ProtectedRoute roles={['admin','registrar','hod','faculty']}><AttendanceConsole /></ProtectedRoute>} />
        <Route path="/audience" element={<ProtectedRoute roles={['admin','registrar','hod']}><AudienceManagement /></ProtectedRoute>} />
        {/* Phase 6 – System */}
        <Route path="/obe/settings" element={<ProtectedRoute roles={['admin','registrar']}><OBESettings /></ProtectedRoute>} />
        <Route path="/institution-settings" element={<ProtectedRoute roles={['admin']}><InstitutionSettings /></ProtectedRoute>} />
        <Route path="/sso-config" element={<ProtectedRoute roles={['admin']}><SSOConfig /></ProtectedRoute>} />
        <Route path="/biometric" element={<ProtectedRoute roles={['admin','registrar']}><BiometricManagement /></ProtectedRoute>} />
        <Route path="/feed-settings" element={<ProtectedRoute roles={['admin']}><FeedSettings /></ProtectedRoute>} />
        {/* Phase 7 – Integrations */}
        <Route path="/integrations" element={<ProtectedRoute roles={['admin']}><Integrations /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' } }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
