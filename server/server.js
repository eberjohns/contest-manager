const crypto = require('crypto');
const ADMIN_KEY = "ADMIN-" + crypto.randomBytes(4).toString('hex').toUpperCase();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JUDGE0_URL = process.env.JUDGE0_URL || 'http://judge0-server:2358';

app.use(cors());
app.use(express.json());

// --- DATABASE SETUP ---
const db = new Database('./data/contest.db');

db.exec(`
    -- 1. USERS (Stores Timer & Lock Status)
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        role TEXT DEFAULT 'student', -- 'admin' or 'student'
        start_time INTEGER,          -- Timestamp when they FIRST logged in
        end_time INTEGER,            -- Timestamp when they clicked "Finish Contest"
        is_finished BOOLEAN DEFAULT 0, -- 1 if they submitted everything
        session_token TEXT           -- 'active' means logged in
    );

    -- 2. QUESTIONS (Stores Templates & Hidden Test Cases)
    CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        templates TEXT,        -- JSON: {"71": "python_code", "54": "cpp_code"}
        test_cases TEXT        -- JSON: [{input, output}, {input, output}]
    );

    -- 3. DRAFTS (Saves student work in progress)
    CREATE TABLE IF NOT EXISTS drafts (
        username TEXT,
        question_id TEXT,
        code TEXT,
        language_id INTEGER,
        PRIMARY KEY (username, question_id)
    );

    -- 4. RESULTS (Final Grades for Leaderboard)
    CREATE TABLE IF NOT EXISTS results (
        username TEXT,
        question_id TEXT,
        status TEXT, -- 'Accepted', 'Wrong Answer', 'Compilation Error'
        PRIMARY KEY (username, question_id)
    );

    -- 5. SETTINGS (Global Config)
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    
    -- Default Settings
    INSERT OR IGNORE INTO settings (key, value) VALUES 
    ('blind_mode', 'false'),       -- If true, hides error details from students
    ('contest_active', 'true');    -- If false, rejects new logins
`);

// --- HELPER: Generate ID ---
const generateId = () => 'Q-' + Math.random().toString(36).substr(2, 5).toUpperCase();

// ==========================================
//              AUTHENTICATION API
// ==========================================

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // 1. ADMIN LOGIN
    if (username === ADMIN_KEY) {
        return res.json({
        role: 'admin',
        username: 'ADMIN'
        });
    }

    // 2. CHECK CONTEST STATUS
    const activeSetting = db.prepare("SELECT value FROM settings WHERE key='contest_active'").get();
    if (activeSetting && activeSetting.value === 'false') {
        return res.status(403).json({ error: "Contest is currently closed." });
    }

    // 3. STUDENT LOGIN / REGISTRATION
    let user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

    if (!user) {
        // Register new user & Start Timer
        const now = Date.now();
        try {
            db.prepare("INSERT INTO users (username, role, start_time, session_token) VALUES (?, 'student', ?, 'active')")
              .run(username, now);
            user = { username, role: 'student', start_time: now, is_finished: 0 };
        } catch (err) {
            return res.status(500).json({ error: "Login failed" });
        }
    } else {
        // Check if locked out
        if (user.is_finished) {
            return res.status(403).json({ error: "You have already submitted your contest." });
        }
        // Check session lock (Optional: strictly enforce single device)
        if (user.session_token === 'active') {
             // For a robust system, you might block them. 
             // For this version, we allow re-login which kicks the previous session implicitly by UI state.
             // return res.status(403).json({ error: "User already logged in!" });
        }
        
        // Update session to active
        db.prepare("UPDATE users SET session_token = 'active' WHERE username = ?").run(username);
    }

    res.json({ 
        success: true, 
        role: 'student', 
        username: user.username, 
        start_time: user.start_time 
    });
});

app.post('/api/logout', (req, res) => {
    const { username } = req.body;
    db.prepare("UPDATE users SET session_token = NULL WHERE username = ?").run(username);
    res.json({ success: true });
});

// ==========================================
//              ADMIN APIs
// ==========================================

// 1. CREATE SMART QUESTION
// Accepts: title, description, templates (obj), solution_code (Python), test_inputs (array)
app.post('/api/questions', async (req, res) => {
    const { title, description, templates, solution_code, test_inputs } = req.body;
    
    const id = generateId(); 
    const testCases = [];

    try {
        console.log(`[Admin] Generating outputs for ${title}...`);

        // Run "Golden Solution" against every input to get the Expected Output
        for (const input of test_inputs) {
            const judgeRes = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
                source_code: solution_code,
                language_id: 71, // 71 is Python (Golden Solution Language)
                stdin: input
            });

            // If Golden Solution fails, abort!
            if (judgeRes.data.status.id !== 3) {
                return res.status(400).json({ 
                    error: `Reference solution failed on input: "${input}".\nError: ${judgeRes.data.stderr}` 
                });
            }

            testCases.push({
                input: input,
                output: judgeRes.data.stdout || "" 
            });
        }

        // Save to DB
        const stmt = db.prepare(`
            INSERT INTO questions (id, title, description, templates, test_cases)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(id, title, description, JSON.stringify(templates), JSON.stringify(testCases));

        console.log(`[Admin] Question ${id} created successfully.`);
        res.json({ success: true, id: id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to process question." });
    }
});

// 2. DELETE QUESTION
app.delete('/api/questions/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Delete failed" });
    }
});

// 3. MANAGE SETTINGS (Blind Mode, Active Status)
app.get('/api/settings', (req, res) => {
    const blind = db.prepare("SELECT value FROM settings WHERE key = 'blind_mode'").get();
    const active = db.prepare("SELECT value FROM settings WHERE key = 'contest_active'").get();
    res.json({ 
        blind_mode: blind ? blind.value === 'true' : false,
        contest_active: active ? active.value === 'true' : true
    });
});

app.post('/api/settings', (req, res) => {
    const { blind_mode, contest_active } = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    
    if (blind_mode !== undefined) stmt.run('blind_mode', String(blind_mode));
    if (contest_active !== undefined) stmt.run('contest_active', String(contest_active));
    
    res.json({ success: true });
});

// 4. RESET CONTEST (Wipe Users & Results)
app.post('/api/admin/reset', (req, res) => {
    try {
        db.exec(`
            DELETE FROM users;
            DELETE FROM drafts;
            DELETE FROM results;
            UPDATE settings SET value = 'true' WHERE key = 'contest_active';
        `);
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: "Reset failed" });
    }
});

// ==========================================
//              STUDENT APIs
// ==========================================

// 1. GET ALL QUESTIONS (Without Test Cases)
app.get('/api/questions', (req, res) => {
    try {
        // We do NOT select test_cases here to prevent cheating
        const rows = db.prepare('SELECT id, title, description, templates FROM questions').all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch questions" });
    }
});

// 2. RUN CODE (Test Run)
app.post('/api/run', async (req, res) => {
    const { code, language_id, stdin } = req.body;
    try {
        const response = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
            source_code: code,
            language_id: language_id,
            stdin: stdin
        });

        // Check Blind Mode
        const setting = db.prepare("SELECT value FROM settings WHERE key = 'blind_mode'").get();
        const isBlind = setting ? setting.value === 'true' : false;

        let output = response.data.stdout || "";
        let error = response.data.stderr || response.data.compile_output || "";

        // Hide Error if Blind Mode is ON
        if (isBlind && error) {
            error = "🚫 Error Details Hidden (Blind Mode Active)\nCheck your syntax and logic carefully.";
        }

        res.json({ 
            output: output,
            error: error
        });
    } catch (err) {
        res.status(500).json({ error: "Execution Engine Failed" });
    }
});

// 3. SAVE DRAFT
app.post('/api/save_draft', (req, res) => {
    const { username, question_id, code, language_id } = req.body;
    try {
        db.prepare(`
            INSERT OR REPLACE INTO drafts (username, question_id, code, language_id)
            VALUES (?, ?, ?, ?)
        `).run(username, question_id, code, language_id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Save failed" });
    }
});

// 4. GET DRAFTS (Load previous work)
app.get('/api/drafts/:username', (req, res) => {
    const rows = db.prepare("SELECT question_id, code, language_id FROM drafts WHERE username = ?").all(req.params.username);
    res.json(rows);
});

// 5. FINISH CONTEST (Submit All & Grade)
app.post('/api/finish_contest', async (req, res) => {
    const { username } = req.body;
    
    try {
        // 1. Lock the User
        const now = Date.now();
        db.prepare("UPDATE users SET is_finished = 1, end_time = ?, session_token = NULL WHERE username = ?").run(now, username);

        // 2. Fetch all drafts for this user
        const drafts = db.prepare("SELECT * FROM drafts WHERE username = ?").all(username);
        const questions = db.prepare("SELECT * FROM questions").all();

        // 3. Grade each draft
        for (const draft of drafts) {
            const question = questions.find(q => q.id === draft.question_id);
            if (!question) continue;

            const testCases = JSON.parse(question.test_cases || '[]');
            let finalStatus = "Accepted";

            // Run against all Hidden Test Cases
            for (const test of testCases) {
                try {
                    const judgeRes = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
                        source_code: draft.code,
                        language_id: draft.language_id || 71, // Default Python if missing
                        stdin: test.input,
                        expected_output: test.output // Judge0 Auto-Compare
                    });

                    // ID 3 = Accepted. Anything else is a fail.
                    if (judgeRes.data.status.id !== 3) {
                        finalStatus = judgeRes.data.status.description; 
                        break; 
                    }
                } catch (e) {
                    finalStatus = "System Error";
                    break;
                }
            }

            // Save Final Result
            db.prepare("INSERT OR REPLACE INTO results (username, question_id, status) VALUES (?, ?, ?)").run(username, draft.question_id, finalStatus);
        }

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Submission failed" });
    }
});

// ==========================================
//              SHARED APIs
// ==========================================

// LEADERBOARD (Ranked by Solved Count, then Time)
app.get('/api/leaderboard', (req, res) => {
    try {
        // 1. Get Users and Times
        const users = db.prepare("SELECT username, start_time, end_time FROM users WHERE is_finished = 1").all();
        
        const leaderboard = users.map(user => {
            // Get all 'Accepted' results for this user
            const solved = db.prepare("SELECT count(*) as count FROM results WHERE username = ? AND status = 'Accepted'").get(user.username);
            
            // Calculate Duration (ms)
            const duration = user.end_time - user.start_time;

            return {
                username: user.username,
                solved: solved.count,
                timeMs: duration,
                timeStr: new Date(duration).toISOString().substr(11, 8) // Format HH:MM:SS
            };
        });

        // 2. Sort: Most Solved DESC, then Fastest Time ASC
        leaderboard.sort((a, b) => {
            if (b.solved !== a.solved) return b.solved - a.solved;
            return a.timeMs - b.timeMs;
        });

        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: "Leaderboard error" });
    }
});

app.use(express.static(path.join(__dirname, 'client/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Contest Server Started`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔐 ADMIN LOGIN KEY: ${ADMIN_KEY}`);
  console.log(`⚠️  Save this key. It changes every restart.`);
  console.log(`==================================================`);
});
