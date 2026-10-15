const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000,
      path: '/api' + path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const r = http.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', e => resolve({ status: 0, body: e.message }));
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  const pass = [], fail = [];
  const check = (label, ok, detail) => {
    if (ok) pass.push(label);
    else fail.push(label + (detail ? ': ' + detail : ''));
  };

  // Login
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'Admin@123' });
  const T = login.body.token;
  check('Admin login', !!T);

  // === TIMETABLE ===
  const ttList = await req('GET', '/timetable', null, T);
  check('GET /timetable', ttList.status === 200 && Array.isArray(ttList.body));

  const ttWeekly = await req('GET', '/timetable/weekly', null, T);
  check('GET /timetable/weekly (has days)', ttWeekly.status === 200 && 'Monday' in ttWeekly.body);

  const ttStats = await req('GET', '/timetable/stats', null, T);
  check('GET /timetable/stats', ttStats.status === 200 && 'totalSlots' in ttStats.body);

  const addSlot = await req('POST', '/timetable', { course_id: 1, day: 'Tuesday', start_time: '14:00', end_time: '15:00', room: '202', academic_year_id: 1 }, T);
  check('POST /timetable add slot', addSlot.status === 201, JSON.stringify(addSlot.body));
  const slotId = addSlot.body.id;

  const delSlot = await req('DELETE', '/timetable/' + slotId, null, T);
  check('DELETE /timetable/:id', delSlot.status === 200);

  // === ADMISSIONS ===
  const admList = await req('GET', '/admissions', null, T);
  check('GET /admissions', admList.status === 200 && Array.isArray(admList.body));

  const admOne = await req('GET', '/admissions/2', null, T);
  check('GET /admissions/:id (with docs)', admOne.status === 200 && 'documents' in admOne.body);

  const addDoc = await req('POST', '/admissions/2/documents', { doc_type: 'id_proof', doc_name: 'Aadhar.pdf' }, T);
  check('POST /admissions/:id/documents', addDoc.status === 201);

  const admit = await req('POST', '/admissions/2/admit', { enrollment_number: 'MSRIM-TEST-202', semester: 1, batch_year: 2025, section: 'B' }, T);
  // #2 is documents_verified (not form_approved), so should get a 400
  check('POST /admissions/:id/admit (blocks if not approved)', admit.status === 400, admit.body.error);

  // === STUDENTS sub-routes ===
  const stuAtt = await req('GET', '/students/1/attendance', null, T);
  check('GET /students/:id/attendance', stuAtt.status === 200 && 'summary' in stuAtt.body && 'overall' in stuAtt.body);

  const stuRes = await req('GET', '/students/1/results', null, T);
  check('GET /students/:id/results', stuRes.status === 200 && 'results' in stuRes.body && 'summary' in stuRes.body);

  const deact = await req('PUT', '/students/10/deactivate', { status: 'inactive' }, T);
  check('PUT /students/:id/deactivate', deact.status === 200);

  // === FACULTY ===
  const facUpdate = await req('PUT', '/faculty/1', { designation: 'Senior Professor', experience_years: 15 }, T);
  check('PUT /faculty/:id', facUpdate.status === 200);

  const facAtt = await req('GET', '/faculty/1/attendance', null, T);
  check('GET /faculty/:id/attendance', facAtt.status === 200 && 'records' in facAtt.body);

  const facStats = await req('GET', '/faculty/stats/overview', null, T);
  check('GET /faculty/stats/overview', facStats.status === 200 && 'total' in facStats.body);

  // === COURSES ===
  const courseDetail = await req('GET', '/courses/1', null, T);
  check('GET /courses/:id', courseDetail.status === 200 && 'enrolledStudents' in courseDetail.body);
  check('GET /courses/:id includes timetable array', Array.isArray(courseDetail.body.timetable));
  check('GET /courses/:id includes students array', Array.isArray(courseDetail.body.students));

  // === NOTICES ===
  const noticeOne = await req('GET', '/notices/1', null, T);
  check('GET /notices/:id', noticeOne.status === 200 && 'title' in noticeOne.body);

  const noticeStats = await req('GET', '/notices/stats', null, T);
  check('GET /notices/stats', noticeStats.status === 200 && 'total' in noticeStats.body && 'pinned' in noticeStats.body);

  const pinBefore = await req('GET', '/notices/2', null, T);
  const pinToggle = await req('PATCH', '/notices/2/pin', null, T);
  check('PATCH /notices/:id/pin toggles', pinToggle.status === 200 && pinToggle.body.is_pinned !== pinBefore.body.is_pinned);

  // Toggle back
  await req('PATCH', '/notices/2/pin', null, T);

  // === STRUCTURE CRUD ===
  const addDept = await req('POST', '/structure/departments', { name: 'Operations Dept', code: 'OPS' }, T);
  check('POST /structure/departments', addDept.status === 201);
  const deptId = addDept.body.id;

  const updDept = await req('PUT', '/structure/departments/' + deptId, { name: 'Operations Dept Updated', code: 'OPS' }, T);
  check('PUT /structure/departments/:id', updDept.status === 200);

  const addProg = await req('POST', '/structure/programs', { name: 'Executive MBA', code: 'EMBA', duration_years: 1, department_id: 1 }, T);
  check('POST /structure/programs', addProg.status === 201);

  const updProg = await req('PUT', '/structure/programs/' + addProg.body.id, { name: 'Executive MBA (Updated)', code: 'EMBA', duration_years: 1, department_id: 1 }, T);
  check('PUT /structure/programs/:id', updProg.status === 200);

  const addAY = await req('POST', '/structure/academic-years', { name: '2027-2029', start_date: '2027-07-01', end_date: '2029-06-30', is_current: false }, T);
  check('POST /structure/academic-years', addAY.status === 201);

  const updAY = await req('PUT', '/structure/academic-years/' + addAY.body.id, { name: '2027-2029 Batch', start_date: '2027-07-01', end_date: '2029-06-30' }, T);
  check('PUT /structure/academic-years/:id', updAY.status === 200);

  // === REPORTS ===
  const repStudents = await req('GET', '/reports/students', null, T);
  check('GET /reports/students', repStudents.status === 200 && 'students' in repStudents.body && 'summary' in repStudents.body);
  check('GET /reports/students summary has total', repStudents.body.summary?.total > 0);

  const repAtt = await req('GET', '/reports/attendance', null, T);
  check('GET /reports/attendance', repAtt.status === 200 && 'records' in repAtt.body && 'summary' in repAtt.body);

  const repResults = await req('GET', '/reports/results', null, T);
  check('GET /reports/results', repResults.status === 200 && 'records' in repResults.body && 'summary' in repResults.body);

  const repFees = await req('GET', '/reports/fees', null, T);
  check('GET /reports/fees', repFees.status === 200 && 'records' in repFees.body && 'defaulters' in repFees.body);
  check('GET /reports/fees collected > 0', repFees.body.summary?.totalCollected > 0);

  const repPlacements = await req('GET', '/reports/placements', null, T);
  check('GET /reports/placements', repPlacements.status === 200 && 'records' in repPlacements.body && 'summary' in repPlacements.body);

  const repFaculty = await req('GET', '/reports/faculty', null, T);
  check('GET /reports/faculty', repFaculty.status === 200 && 'records' in repFaculty.body);
  check('GET /reports/faculty has records', repFaculty.body.records?.length > 0);

  const repLib = await req('GET', '/reports/library', null, T);
  check('GET /reports/library', repLib.status === 200 && 'overdue' in repLib.body && 'topBorrowed' in repLib.body);

  // === PARENTS ===
  const parentsList = await req('GET', '/parents', null, T);
  check('GET /parents', parentsList.status === 200 && Array.isArray(parentsList.body));

  const parentsStats = await req('GET', '/parents/stats', null, T);
  check('GET /parents/stats', parentsStats.status === 200 && 'total' in parentsStats.body && 'active' in parentsStats.body);

  // === SUMMARY ===
  const total = pass.length + fail.length;
  console.log('\n' + '='.repeat(52));
  console.log('RESULTS: ' + pass.length + '/' + total + ' passed');
  console.log('='.repeat(52));
  pass.forEach(p => console.log('  ✓ ' + p));
  if (fail.length > 0) {
    console.log('\nFAILED:');
    fail.forEach(f => console.log('  ✗ ' + f));
  }
  console.log('='.repeat(52));
  process.exit(fail.length > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
