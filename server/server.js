// server/server.js
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

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    inputs TEXT,     -- JSON string of inputs
    expected TEXT    -- JSON string of expected outputs
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    question_id INTEGER,
    status TEXT,     -- 'PASS', 'FAIL', 'ERROR'
    code TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  INSERT OR IGNORE INTO config (key, value) VALUES ('autocomplete', 'true');
  INSERT OR IGNORE INTO config (key, value) VALUES ('highlighting', 'true');
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