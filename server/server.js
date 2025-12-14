// server/server.js
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. CONFIG & SECURITY ---
const CLASS_PIN = process.env.CLASS_PIN || "1234"; // Default if not provided
const ADMIN_TOKEN = "ADMIN-" + crypto.randomBytes(4).toString('hex').toUpperCase();

// Enable CORS so frontend can talk to backend
app.use(cors());
app.use(express.json());

// --- 2. DATABASE SETUP (SQLite) ---
// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir);
}

// Connect to DB (It creates the file 'contest.db' if missing)
const db = new Database(path.join(dataDir, 'contest.db'));

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    role TEXT,
    token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    question_id TEXT,
    status TEXT,     -- 'PASS', 'FAIL', 'ERROR'
    code TEXT,
    elapsed_time INTEGER, -- Time taken in milliseconds
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      template TEXT,
      test_cases TEXT -- New Column (Stores JSON)
  );
  
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO config (key, value) VALUES ('autocomplete', 'true');
  INSERT OR IGNORE INTO config (key, value) VALUES ('highlighting', 'true');

  CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
  );
  INSERT OR IGNORE INTO settings (key, value) VALUES ('blind_mode', 'false');
`);

console.log("✅ Database initialized successfully.");

// Ensure Config Table Exists (Run this safely every time)
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    INSERT OR IGNORE INTO config (key, value) VALUES ('autocomplete', 'true');
    INSERT OR IGNORE INTO config (key, value) VALUES ('highlighting', 'true');
  `);
} catch (err) {
  console.error("Config Table Error:", err.message);
}

// --- 3. API ROUTES (The Skeleton) ---

// Serve the Frontend Files
// This line tells Express to serve files from the 'client' folder
// Serve the React App (Production Build)
app.use(express.static(path.join(__dirname, 'client/dist')));

// Explicitly send index.html for the home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/index.html'));
});

// Login Logic (The Secure Gatekeeper)
app.post('/api/login', (req, res) => {
    const { username, pin } = req.body;

    // 1. Check PIN
    if (pin !== CLASS_PIN) {
        return res.status(401).json({ error: "Invalid Class PIN" });
    }

    // 2. Check Admin
    if (username === ADMIN_TOKEN) {
        return res.json({ 
            role: 'ADMIN', 
            token: 'admin-session-' + crypto.randomUUID(),
            username: 'Admin'
        });
    }

    // 3. Check Student (First Come First Serve)
    const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (existing) {
        // If user exists, simplistic logic: reject (simulate "taken").
        // In production, we'd check their browser token to allow re-login.
        return res.status(409).json({ error: "Username already taken." });
    }

    // Register new student
    const token = crypto.randomUUID();
    db.prepare('INSERT INTO users (username, role, token) VALUES (?, ?, ?)').run(username, 'STUDENT', token);

    return res.json({ role: 'STUDENT', token, username });
});

// --- CONFIG API ---

app.get('/api/config', (req, res) => {
    try {
        const rows = db.prepare('SELECT key, value FROM config').all();
        const config = {};
        // Convert string 'true'/'false' back to boolean
        rows.forEach(row => config[row.key] = (row.value === 'true'));
        res.json(config);
    } catch (err) {
        console.error("GET Config Error:", err);
        res.status(500).json({ error: "Failed to fetch config" });
    }
});

app.post('/api/config', (req, res) => {
    try {
        const { key, value } = req.body;
        console.log(`[CONFIG CHANGE] Setting ${key} to ${value}`); // <--- DEBUG LOG
        
        // Store as string 'true' or 'false'
        const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
        stmt.run(key, String(value));
        
        res.json({ success: true });
    } catch (err) {
        console.error("POST Config Error:", err);
        res.status(500).json({ error: "Failed to update config" });
    }
});

// --- ADMIN: QUESTION MANAGEMENT ---

// Get all questions (for students and admin)
app.get('/api/questions', (req, res) => {
    try {
        const rows = db.prepare('SELECT id, title, description, template FROM questions').all();
        res.json(rows);
    } catch (err) {
        console.error("GET Questions Error:", err);
        res.status(500).json({ error: "Failed to fetch questions" });
    }
});

// Get all questions
// const { v4: uuidv4 } = require('uuid'); // You might need to install this: npm install uuid
// OR just use a simple random string generator if you don't want to install uuid
const generateId = () => 'Q-' + Math.random().toString(36).substr(2, 5).toUpperCase();

app.post('/api/questions', async (req, res) => {
    const { title, description, template, solution_code, test_inputs } = req.body;
    
    // 1. Generate ID automatically
    const id = generateId(); 
    const testCases = [];

    try {
        // 2. GENERATE OUTPUTS (Run Reference Solution)
        for (const input of test_inputs) {
            // Run the "Golden Code" on Judge0
            const judgeRes = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
                source_code: solution_code,
                language_id: 71, // Python
                stdin: input
            });

            // If the reference solution fails, stop everything!
            if (judgeRes.data.status.id !== 3) {
                return res.status(400).json({ 
                    error: `Reference solution failed on input: "${input}". Error: ${judgeRes.data.stderr}` 
                });
            }

            // Save the generated output
            testCases.push({
                input: input,
                output: judgeRes.data.stdout || "" 
            });
        }

        // 3. Save to Database
        const stmt = db.prepare(`
            INSERT INTO questions (id, title, description, template, test_cases)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(id, title, description, template, JSON.stringify(testCases));

        res.json({ success: true, id: id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to process question." });
    }
});


// Delete a Question
app.delete('/api/questions/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete" });
    }
});

// Get/Update Settings
app.get('/api/settings', (req, res) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'blind_mode'").get();
    res.json({ blind_mode: row ? row.value === 'true' : false });
});

app.post('/api/settings', (req, res) => {
    const { blind_mode } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('blind_mode', ?)").run(String(blind_mode));
    res.json({ success: true });
});

// --- SUBMISSION & LEADERBOARD API ---

// 1. Submit Code (Auto-Graded)
app.post('/api/submit', async (req, res) => {
    const { username, question_id, code, elapsed_time } = req.body;
    
    try {
        // 1. Fetch the Question & Test Cases
        const question = db.prepare('SELECT test_cases FROM questions WHERE id = ?').get(question_id);
        if (!question) return res.status(404).json({ error: "Question not found" });

        const testCases = JSON.parse(question.test_cases);
        let finalStatus = "Accepted"; // Assume success until proven fail

        // 2. Run against ALL test cases
        for (const test of testCases) {
            const judgeRes = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
                source_code: code,
                language_id: 71, // Python
                stdin: test.input,
                expected_output: test.output // <--- The Magic: Judge0 compares this!
            });

            // Status ID 3 means "Accepted" (Correct Answer)
            // Any other ID (4=Wrong Answer, 5=Time Limit, 6=Compilation Error) is a fail.
            if (judgeRes.data.status.id !== 3) {
                finalStatus = judgeRes.data.status.description; // e.g., "Wrong Answer"
                break; // Stop testing if one fails
            }
        }

        // 3. Save Result to DB
        const stmt = db.prepare(`
            INSERT INTO submissions (username, question_id, code, status, elapsed_time)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(username, question_id, code, finalStatus, elapsed_time);

        res.json({ success: true, status: finalStatus }); 

    } catch (err) {
        console.error("Submit Error:", err);
        res.status(500).json({ error: "Grading Failed" });
    }
});

// 2. Get Leaderboard (For Admin)
app.get('/api/leaderboard', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        s.username,
        s.question_id,
        q.title,
        s.status,
        s.elapsed_time,
        s.timestamp
      FROM submissions s
      LEFT JOIN questions q ON s.question_id = q.id
      ORDER BY s.elapsed_time ASC
    `).all();

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Leaderboard error" });
  }
});

// --- EXECUTION API ---

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://judge0:2358';

app.post('/api/run', async (req, res) => {
    try {
        const { code, language_id, stdin } = req.body;
        const response = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
            source_code: code,
            language_id: language_id,
            stdin: stdin
        });

        // CHECK BLIND MODE
        const setting = db.prepare("SELECT value FROM settings WHERE key = 'blind_mode'").get();
        const isBlind = setting ? setting.value === 'true' : false;

        let output = response.data.stdout || "";
        let error = response.data.stderr || response.data.compile_output || "";

        // IF BLIND MODE IS ON & THERE IS AN ERROR -> HIDE IT
        if (isBlind && error) {
            error = "🚫 Error Details Hidden (Debugging Mode Active)\nCheck your syntax and logic carefully.";
        }

        res.json({ 
            output: output,
            error: error
        });

    } catch (err) {
        console.error("Judge0 Error:", err.message);
        res.status(500).json({ error: "Execution Engine Failed" });
    }
});

// Handle React Routing (Redirect all unknown routes to index.html)
app.get('*', (req, res) => {
    // If the request is for an API, don't return HTML
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// --- 4. STARTUP MESSAGE ---
app.listen(PORT, () => {
    console.log(`\n\n`);
    console.log(`==================================================`);
    console.log(`   🚀 CONTEST SERVER STARTED on Port ${PORT}`);
    console.log(`   🔐 CLASS PIN:        ${CLASS_PIN}`);
    console.log(`   👑 ADMIN USERNAME:   ${ADMIN_TOKEN}`);
    console.log(`   (Copy the Admin Username above to login)`);
    console.log(`==================================================`);
    console.log(`\n`);
});