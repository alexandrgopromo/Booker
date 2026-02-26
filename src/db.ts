import Database from 'better-sqlite3';

const db = new Database('schedule.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, -- YYYY-MM-DD
    time TEXT NOT NULL, -- HH:mm
    group_name TEXT NOT NULL,
    user_name TEXT,
    secret_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration to add secret_code if it doesn't exist (for existing dbs)
try {
  db.exec('ALTER TABLE slots ADD COLUMN secret_code TEXT');
} catch (e) {
  // Column likely already exists
}

// Seed data if empty
const count = db.prepare('SELECT count(*) as count FROM slots').get() as { count: number };

if (count.count === 0) {
  console.log('Seeding database...');
  
  const insert = db.prepare('INSERT INTO slots (date, time, group_name) VALUES (?, ?, ?)');
  
  const generateSlots = (dates: string[], group: string, start: string, end: string) => {
    dates.forEach(date => {
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      
      let currentH = startH;
      let currentM = startM;
      
      while (currentH < endH || (currentH === endH && currentM < endM)) {
        const timeStr = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;
        insert.run(date, timeStr, group);
        
        currentM += 15;
        if (currentM >= 60) {
          currentH++;
          currentM = 0;
        }
      }
    });
  };

  const year = 2026; // Assuming 2026 based on context, or current year. 
  // Actually, let's use the current year from the system time if possible, or just hardcode 2026 as per prompt context implies upcoming.
  // The prompt just says "03.03", "04.03". Given the current date is Feb 2026, March 2026 is the logical target.
  
  const fmtDate = (day: string) => `${year}-03-${day}`;

  // Group 1: 10:00 – 11:30
  // Dates 03.03 and 04.03, and 10.03 and 11.03
  generateSlots([fmtDate('03'), fmtDate('04'), fmtDate('10'), fmtDate('11')], 'Группа 1', '10:00', '11:30');
  
  // Group 2: 11:00 – 12:00
  // Dates 03.03 and 04.03, and 10.03 and 11.03
  generateSlots([fmtDate('03'), fmtDate('04'), fmtDate('10'), fmtDate('11')], 'Группа 2', '11:00', '12:00');

  // 05.03 and 12.03
  // Group 1: 10:00 – 11:00
  generateSlots([fmtDate('05'), fmtDate('12')], 'Группа 1', '10:00', '11:00');
  // Group 2: 17:15 – 18:15
  generateSlots([fmtDate('05'), fmtDate('12')], 'Группа 2', '17:15', '18:15');

  // 06.03
  // Group 1: 12:00 - 13:00
  generateSlots([fmtDate('06')], 'Группа 1', '12:00', '13:00');

  // 16.03 and 17.03
  // Group 1: 10:00 - 11:30
  generateSlots([fmtDate('16'), fmtDate('17')], 'Группа 1', '10:00', '11:30');
  // Group 2: 17:00 - 18:30
  generateSlots([fmtDate('16'), fmtDate('17')], 'Группа 2', '17:00', '18:30');
  
  console.log('Database seeded.');
}

export default db;
