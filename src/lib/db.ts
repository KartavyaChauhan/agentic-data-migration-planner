import Database from 'better-sqlite3';
import path from 'path';

// Using a file-based SQLite database in the root of the project
const dbPath = path.join(process.cwd(), 'migration.db');
const db = new Database(dbPath, { verbose: console.log });

// Initialize tables if they don't exist
export const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS source_employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      legacy_id TEXT UNIQUE,
      full_name TEXT,
      date_of_birth TEXT,
      department TEXT,
      hire_date TEXT,
      is_active INTEGER,
      email_address TEXT
    );

    CREATE TABLE IF NOT EXISTS target_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      email TEXT UNIQUE,
      role TEXT,
      status TEXT,
      joined_at TEXT,
      migration_run_id INTEGER,
      source_id INTEGER UNIQUE
    );

    CREATE TABLE IF NOT EXISTS migration_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER,
      mapping_json TEXT,
      status TEXT, -- 'draft', 'approved'
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      approved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS migration_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER,
      run_type TEXT, -- 'dry_run', 'execution'
      status TEXT, -- 'in_progress', 'completed', 'rolled_back'
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS migration_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER,
      source_record_id INTEGER,
      status TEXT, -- 'accepted', 'rejected'
      error_details TEXT,
      transformed_data_json TEXT
    );
  `);

  // Seed source data if empty
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM source_employees');
  const countResult = countStmt.get() as { count: number };
  
  if (countResult.count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO source_employees (legacy_id, full_name, date_of_birth, department, hire_date, is_active, email_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const seedData = [
      ['EMP001', 'John Doe', '1985-05-15', 'Engineering', '2010-08-01', 1, 'johndoe@legacy.com'],
      ['EMP002', 'Jane Smith', '1990-11-22', 'Marketing', '2015-03-15', 1, 'janesmith@legacy.com'],
      ['EMP003', 'Bob Johnson', '1978-02-10', 'Sales', '2005-06-20', 0, 'bobj@legacy.com'],
      ['EMP004', 'Alice Williams', '1992-07-30', 'Engineering', '2018-01-10', 1, 'alice.w@legacy.com'],
      ['EMP005', 'Charlie Brown', '1988-12-05', 'HR', '2012-09-01', 1, 'cbrown@legacy.com'],
      ['EMP006', 'Bad Data', 'invalid-date', 'Unknown', 'N/A', 1, 'bad@email'], // Intentional bad data
      ['EMP007', 'No Email', '1980-01-01', 'Sales', '2010-01-01', 1, null], // Missing email
    ];
    
    const insertMany = db.transaction((data) => {
      for (const row of data) {
        insertStmt.run(row);
      }
    });
    
    insertMany(seedData);
  }
};

// Auto-initialize on import
initDb();

export default db;
