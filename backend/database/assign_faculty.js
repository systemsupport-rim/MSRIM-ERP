/**
 * Assign faculty to courses based on department + subject-area matching
 * Run: node backend/database/assign_faculty.js
 */
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(path.join(__dirname, 'msrim_erp.db'));

const update = db.prepare('UPDATE courses SET faculty_id=? WHERE id=?');

// Faculty IDs (from DB)
const F = {
  // Finance, Banking & Insurance
  TRIVENI:    29,  // Triveni P           — Chairperson & Professor (Finance)
  KUMUDA:     18,  // Kumuda P.R          — Associate Professor (Finance)
  SADAF:      27,  // Sadaf Anwar         — Associate Professor (Finance)
  SAGAR:      28,  // Sagar M             — Associate Professor (Finance)
  EKTA:       12,  // Ekta Yadav          — Assistant Professor (Finance)
  KIRAN_KV:   16,  // Kiran Kumar K V     — Adjunct (BFSI/Finance)
  KIRRON:     17,  // Kirron Bindu        — Adjunct (BFSI/Finance)

  // Business Analytics & Data Science
  SHASHIDHAR:  5,  // Achakkagari Shashidhar — Data Science, Asst Prof
  ARAVINDA:    9,  // Aravinda Reddy M.N  — Chairperson, BA
  GIFTY:      15,  // Gifty Malhotra      — Asst Prof, BA
  MALLIESWARI:19,  // Mallieswari .R      — Asst Prof, BA

  // HR & General Management
  ANITA:       8,  // Anita Singh         — Chairperson & Assoc Prof (HR)
  PADMAJA:    23,  // Padmaja V           — Professor (HR)
  AJIT:        7,  // Ajit Paul           — HR
  NEERAJ:     21,  // NEERAJ KUMAR        — HR
  GARIMA:     13,  // Garima Pande        — HR
  RAGHAVENDRA:24,  // Raghavendra S       — HR
  YASHASWINI: 30,  // Yashaswini Murthy B — Asst Prof (HR)

  // Marketing & International Business
  BIKASH:     11,  // Bikash Ranjan Debata — Professor (Marketing)
  MEGHNA:     20,  // Meghna Verma        — Assoc Prof (Marketing)
  NIHARIKA:   22,  // Niharika Mishra     — Sr Asst Prof (Marketing)
  ARUL:       10,  // Arul Jyothi         — Sr Asst Prof (Marketing)

  // Operations & Supply Chain
  AJAY:        6,  // Ajay Pagare         — Assoc Prof (Operations)
  REENA:      25,  // Reena Y A           — Asst Prof (Operations)
  RIBHU:      26,  // Ribhu Ray           — Asst Prof (Operations)

  // Admin / Dean
  GEETHA:     14,  // Geetha M Rajaram    — Professor & Dean
  PADMASKHI:  34,  // Padmaskhi Lokesh    — Admin

  // International Affairs
  ANJANA:     32,  // Anjana Seshagiri    — Head Ramaiah Japan Center

  // Placements
  JEEVITHA:   33,  // Jeevitha .R         — Head Placements
};

// course_id → faculty_id mapping (domain-based assignment)
const assignments = [
  // ── Term 1 — 2026 Batch (Core) ─────────────────────────────────────────────
  [97,  F.TRIVENI],       // Financial Reporting for Decision Making  → Finance
  [98,  F.ARAVINDA],      // Decision Sciences - I                    → BA (quant)
  [99,  F.PADMAJA],       // Foundations in Mgmt & OB                 → HR/General Mgmt
  [100, F.GIFTY],         // Information System for Decision Making   → BA/IS
  [101, F.GEETHA],        // Strategic Wisdom: The Indian Way         → Dean level
  [102, F.SAGAR],         // Economics for Management                 → Finance
  [103, F.GARIMA],        // Managerial Skills                        → HR/Soft Skills
  [104, F.KUMUDA],        // Business Law & Corporate Governance      → Finance (Law)
  [105, F.JEEVITHA],      // Integrated Live Project (ILP)            → Placements
  [106, F.PADMASKHI],     // Harvard Business Impact (HBI) Online     → Admin

  // ── Term 4 — 2025 Batch ────────────────────────────────────────────────────
  // Core
  [107, F.ANITA],         // Leadership                               → HR
  [108, F.GEETHA],        // Business Ethics & Corporate Governance   → Dean

  // Finance
  [115, F.TRIVENI],       // Derivatives Management                   → Finance (Chair)
  [116, F.SADAF],         // Corporate Valuation                      → Finance

  // BFSI
  [117, F.KIRAN_KV],      // Fintech & Digital Banking                → BFSI Adjunct
  [118, F.KIRRON],        // Investment Banking                       → BFSI Adjunct

  // HR
  [119, F.NEERAJ],        // Performance & Compensation Management    → HR
  [120, F.AJIT],          // OD & Change Management                   → HR
  [121, F.YASHASWINI],    // Learning and Development                 → HR
  [122, F.RAGHAVENDRA],   // Labour Codes & Employment Compliances    → HR

  // Business Analytics
  [123, F.SHASHIDHAR],    // Predictive Analytics using R             → BA (Data Sci)
  [124, F.MALLIESWARI],   // Machine Learning with Python             → BA

  // International Business
  [125, F.BIKASH],        // Global Marketing                         → Marketing/IB
  [126, F.ANJANA],        // International HRM                        → International Affairs

  // Marketing
  [109, F.BIKASH],        // Consumer Behaviour                       → Marketing
  [110, F.ARUL],          // Digital Marketing                        → Marketing
  [111, F.MEGHNA],        // Brand Management & Communication         → Marketing
  [112, F.NIHARIKA],      // Consumer Behaviour (Sec 2)               → Marketing
  [113, F.MEGHNA],        // Digital Marketing (Sec 2)                → Marketing
  [114, F.ARUL],          // Brand Management & Communication (Sec 2) → Marketing

  // Operations
  [127, F.AJAY],          // Total Quality Management                 → Operations
  [128, F.RIBHU],         // Service Operation Management             → Operations

  // Logistics
  [129, F.REENA],         // Quality Toolkit for Managers             → Operations/SCM
  [130, F.AJAY],          // Sustainable Supply Chain Management      → Operations/SCM

  // Entrepreneurship
  [131, F.PADMASKHI],     // Product Development & Scale Up           → Admin/General
  [132, F.SHASHIDHAR],    // Technology for Startups & Digital Innov  → BA/Tech

  // Open Electives
  [133, F.NIHARIKA],      // Corporate Storytelling                   → Marketing
  [134, F.ARAVINDA],      // Optimization Techniques                  → BA (quant)
  [135, F.ANJANA],        // Basic Japanese Language                  → Japan Center
  [136, F.GIFTY],         // Digital Transformation                   → BA/IS
];

let assigned = 0;
assignments.forEach(([courseId, facultyId]) => {
  const r = update.run(facultyId, courseId);
  if (r.changes > 0) {
    const c = db.prepare('SELECT code, name FROM courses WHERE id=?').get(courseId);
    const f = db.prepare('SELECT u.name FROM faculty fac JOIN users u ON u.id=fac.user_id WHERE fac.id=?').get(facultyId);
    console.log(`  ✓ [${c.code}] ${c.name}\n      → ${f?.name}`);
    assigned++;
  }
});

console.log(`\n════════════════════════════════════\n✅ Assigned ${assigned} courses\n════════════════════════════════════`);

// Verify — any still unassigned?
const unassigned = db.prepare('SELECT code, name FROM courses WHERE faculty_id IS NULL').all();
if (unassigned.length) {
  console.log('\n⚠️  Still unassigned:');
  unassigned.forEach(c => console.log(' ', c.code, c.name));
} else {
  console.log('✓  All courses assigned');
}
