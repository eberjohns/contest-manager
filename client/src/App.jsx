import { styles } from './styles';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Editor from "@monaco-editor/react";

// --- CONFIGURATION ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_URL });

// Hardcoded Supported Languages
const SUPPORTED_LANGUAGES = [
  { id: 71, name: "Python (3.8.1)" },
  { id: 50, name: "C (GCC 9.2.0)" },
  { id: 54, name: "C++ (GCC 9.2.0)" },
  { id: 62, name: "Java (OpenJDK 13)" },
  { id: 63, name: "JavaScript (Node.js)" }
];

// ==========================================
//           1. LOGIN SCREEN
// ==========================================
const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [classPin, setClassPin] = useState('');

  const handleLogin = async () => {
    try {
      const res = await api.post('/api/login', {
        username,
        class_pin: classPin
      });

      // Save session info
      localStorage.setItem('username', res.data.username);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('session_token', res.data.session_token);
      if (res.data.start_time) localStorage.setItem('start_time', res.data.start_time);
      
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Login Failed");
    }
  };

  return (
    <div style={styles.centerBox}>
      <div style={styles.loginCard}>
        <h2>🚀 Contest Platform</h2>
        <input 
          style={styles.input} 
          placeholder="Username" 
          value={username} 
          onChange={e => setUsername(e.target.value)} 
        />
        <input
          style={styles.input}
          placeholder="Class PIN"
          type="password"
          value={classPin}
          onChange={e => setClassPin(e.target.value)}
        />
        {error && <p style={{color: 'red'}}>{error}</p>}
        <button style={styles.btnPrimary} onClick={handleLogin}>Enter Contest</button>
      </div>
    </div>
  );
};

// ==========================================
//           2. ADMIN DASHBOARD
// ==========================================
const AdminDashboard = () => {
  const [tab, setTab] = useState('leaderboard');
  const [submissions, setSubmissions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [settings, setSettings] = useState({ blind_mode: false, contest_active: true });
  const [loading, setLoading] = useState(false);

  // New Question Form State
  const [newQ, setNewQ] = useState({ 
    title: '', description: '', solution: '', inputs: [''], templates: {} 
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = () => { fetchLeaderboard(); fetchQuestions(); fetchSettings(); };

  const fetchLeaderboard = async () => {
    try { const res = await api.get('/api/leaderboard'); setSubmissions(res.data); } catch(e){}
  };
  const fetchQuestions = async () => {
    try { const res = await api.get('/api/questions'); setQuestions(res.data); } catch(e){}
  };
  const fetchSettings = async () => {
    try { const res = await api.get('/api/settings'); setSettings(res.data); } catch(e){}
  };

  // --- ACTIONS ---
  const toggleSetting = async (key) => {
    const newVal = !settings[key];
    await api.post('/api/settings', { [key]: newVal });
    setSettings({...settings, [key]: newVal});
  };

  const handleReset = async () => {
    if(!confirm("⚠️ DANGER: This will delete ALL users, drafts, and results. Are you sure?")) return;
    await api.post('/api/admin/reset');
    alert("Contest Reset Successfully.");
    fetchData();
  };

  // --- QUESTION MANAGEMENT ---
  const toggleLanguage = (langId) => {
    const updated = { ...newQ.templates };
    if (updated[langId] !== undefined) delete updated[langId];
    else updated[langId] = ""; // Init with empty string for Admin to fill
    setNewQ({ ...newQ, templates: updated });
  };

  const handleTemplateChange = (langId, code) => {
    setNewQ({ ...newQ, templates: { ...newQ.templates, [langId]: code } });
  };

  const handleSaveQuestion = async () => {
    if (!newQ.title || !newQ.solution) return alert("Title and Golden Solution are required!");
    if (Object.keys(newQ.templates).length === 0) return alert("Select at least one language!");

    setLoading(true);
    try {
      await api.post('/api/questions', {
        title: newQ.title,
        description: newQ.description,
        solution_code: newQ.solution,
        test_inputs: newQ.inputs.filter(i => i.trim() !== ""),
        templates: newQ.templates
      });
      alert("✅ Question Created & Verified!");
      setNewQ({ title: '', description: '', solution: '', inputs: [''], templates: {} });
      fetchQuestions();
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const username = localStorage.getItem('username');
    await api.post('/api/logout', { username });
    localStorage.clear();
    onLogout();
  };

  return (
    <div style={styles.dashboard}>
      <header style={styles.header}>
        <h1>👑 Admin Console</h1>
        <div style={{display:'flex', gap:'10px'}}>
          <button onClick={() => toggleSetting('blind_mode')} style={{...styles.btn, background: settings.blind_mode ? '#d9534f' : '#333'}}>
            {settings.blind_mode ? "Blind Mode: ON" : "Blind Mode: OFF"}
          </button>
          <button onClick={() => toggleSetting('contest_active')} style={{...styles.btn, background: settings.contest_active ? '#28a745' : '#d9534f'}}>
            {settings.contest_active ? "Contest: OPEN" : "Contest: CLOSED"}
          </button>
          <button onClick={handleReset} style={{...styles.btn, background: 'red'}}>Reset</button>
          <button onClick={logout} style={{...styles.btn, background: 'red'}}>Logout</button>
        </div>
      </header>

      <div style={styles.tabs}>
        <button onClick={() => setTab('leaderboard')} style={tab==='leaderboard'?styles.activeTab:styles.tab}>🏆 Leaderboard</button>
        <button onClick={() => setTab('questions')} style={tab==='questions'?styles.activeTab:styles.tab}>📝 Manage Questions</button>
      </div>

      {tab === 'leaderboard' ? (
        <table style={styles.table}>
          <thead>
            <tr><th>Rank</th><th>User</th><th>Solved</th><th>Time</th></tr>
          </thead>
          <tbody>
            {submissions.map((sub, i) => (
              <tr key={i}>
                <td>#{i+1}</td>
                <td>{sub.username}</td>
                <td style={{color:'#0f0'}}>{sub.solved} / {questions.length}</td>
                <td>{sub.timeStr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={styles.splitView}>
          <div style={{flex:1, overflowY:'auto'}}>
            <h3>Existing Questions</h3>
            {questions.map(q => (
              <div key={q.id} style={styles.card}>
                <div style={{fontWeight:'bold'}}>{q.title}</div>
                <button onClick={async () => { if(confirm("Delete?")) { await api.delete(`/api/questions/${q.id}`); fetchQuestions(); }}} style={{color:'red', background:'none', border:'none'}}>Delete</button>
              </div>
            ))}
          </div>

          <div style={{flex:2, background:'#252526', padding:'20px', borderRadius:'8px'}}>
            <h3>Add Smart Question</h3>
            <input placeholder="Title" value={newQ.title} onChange={e=>setNewQ({...newQ, title:e.target.value})} style={styles.input} />
            <textarea placeholder="Description" value={newQ.description} onChange={e=>setNewQ({...newQ, description:e.target.value})} style={{...styles.input, height:'60px'}} />
            
            <div style={{marginTop:'10px'}}>
              <label>Golden Solution (Python 3):</label>
              <textarea 
                placeholder="def solve(): ..." 
                value={newQ.solution} 
                onChange={e=>setNewQ({...newQ, solution:e.target.value})} 
                style={{...styles.codeMsg, height:'100px', border:'1px solid #28a745'}} 
              />
            </div>

            <div style={{marginTop:'10px'}}>
              <label>Test Inputs (for generating outputs):</label>
              {newQ.inputs.map((inp, i) => (
                <div key={i} style={{marginBottom:'5px'}}>
                  <textarea
                    value={inp}
                    onChange={e => {
                      const up = [...newQ.inputs];
                      up[i] = e.target.value;
                      setNewQ({ ...newQ, inputs: up });
                    }}
                    placeholder={`Test Case ${i + 1} (multiline allowed)`}
                    style={{
                      ...styles.input,
                      height: '80px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap'
                    }}
                  />
                </div>
              ))}
              <button onClick={()=>setNewQ({...newQ, inputs:[...newQ.inputs, '']})} style={styles.btnSmall}>+ Add Case</button>
            </div>

            <div style={{marginTop:'20px'}}>
              <label>Allowed Languages & Templates:</label>
              <div style={{display:'flex', gap:'5px', flexWrap:'wrap', margin:'5px 0'}}>
                {SUPPORTED_LANGUAGES.map(lang => {
                  const isSel = newQ.templates[lang.id] !== undefined;
                  return (
                    <button key={lang.id} onClick={()=>toggleLanguage(lang.id)} 
                      style={{...styles.btnSmall, background: isSel ? '#28a745' : '#444'}}>
                      {isSel ? "✅ " : "+ "}{lang.name}
                    </button>
                  );
                })}
              </div>
              {Object.keys(newQ.templates).map(langId => {
                 const lang = SUPPORTED_LANGUAGES.find(l=>l.id==langId);
                 return (
                   <div key={langId} style={{marginTop:'5px'}}>
                     <small style={{color:'#aaa'}}>Template for {lang.name}</small>
                     <textarea 
                       value={newQ.templates[langId]} 
                       onChange={e=>handleTemplateChange(langId, e.target.value)}
                       style={{...styles.codeMsg, height:'60px'}} 
                     />
                   </div>
                 )
              })}
            </div>

            <button onClick={handleSaveQuestion} disabled={loading} style={{...styles.btnPrimary, marginTop:'20px', width:'100%'}}>
              {loading ? "⏳ Validating..." : "💾 Auto-Verify & Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
//           3. STUDENT DASHBOARD
// ==========================================
const StudentDashboard = ({ user, onLogout }) => {
  const [questions, setQuestions] = useState([]);
  const [activeQ, setActiveQ] = useState(null);
  const [drafts, setDrafts] = useState({}); // { qId: { code, langId } }
  
  // Editor State
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState(71);
  const [customInput, setCustomInput] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  // Timer State
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    // 1. Load Questions
    api.get('/api/questions').then(res => {
      setQuestions(res.data);
      if (res.data.length > 0) setActiveQ(res.data[0]);
    });

    // 2. Load Drafts
    api.get(`/api/drafts/${user.username}`).then(res => {
      const draftMap = {};
      res.data.forEach(d => { draftMap[d.question_id] = { code: d.code, langId: d.language_id } });
      setDrafts(draftMap);
    });

    // 3. Start Timer
    const timer = setInterval(() => {
      const start = parseInt(localStorage.getItem('start_time') || Date.now());
      const diff = Date.now() - start;
      const date = new Date(diff);
      setElapsed(date.toISOString().substr(11, 8));
    }, 1000);

    return () => clearInterval(timer);
  }, [user.username]);

  // Handle Question/Draft Switching
  useEffect(() => {
    if (!activeQ) return;
    
    // Check if we have a draft
    const draft = drafts[activeQ.id];
    
    if (draft) {
      // Load Draft
      setCode(draft.code);
      setLanguage(draft.langId);
    } else {
      // Load Template
      const templates = JSON.parse(activeQ.templates || '{}');
      const allowedLangs = Object.keys(templates).map(Number);
      
      // Default to Python (71) if allowed, else first allowed
      let targetLang = allowedLangs.includes(71) ? 71 : allowedLangs[0];
      setLanguage(targetLang);
      setCode(templates[targetLang] || "");
    }
    setOutput(""); // Clear terminal
  }, [activeQ]);

  // Save Draft Logic
  const handleSave = async (newCode) => {
    setCode(newCode);
    // Update Local Draft State
    const updatedDrafts = { ...drafts, [activeQ.id]: { code: newCode, langId: language } };
    setDrafts(updatedDrafts);
    
    // Send to Server (Debounce this in real app)
    await api.post('/api/save_draft', {
      username: user.username,
      question_id: activeQ.id,
      code: newCode,
      language_id: language
    });
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Running...");
    try {
      const res = await api.post('/api/run', { code, language_id: language, stdin: customInput });
      setOutput(res.data.output || res.data.error);
    } catch (err) { setOutput("Execution Failed"); }
    setIsRunning(false);
  };

  const handleFinishContest = async () => {
    if (!confirm("⚠️ Are you sure? This will submit ALL questions and end your contest.")) return;
    try {
      await api.post('/api/finish_contest', { username: user.username });
      alert("🎉 Contest Submitted! Thank you.");
      onLogout(); // Or redirect to a summary page
    } catch (err) { alert("Submission Failed"); }
  };

  const logout = async () => {
    const username = localStorage.getItem('username');
    await api.post('/api/logout', { username });
    localStorage.clear();
    onLogout();
  };

  return (
    <div style={styles.dashboard}>
      {/* TOP BAR */}
      <header style={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
          <h3>🚀 Contest</h3>
          <select value={activeQ?.id || ""} onChange={e => setActiveQ(questions.find(q => q.id === e.target.value))} style={styles.select}>
            {questions.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
          </select>
          <select value={language} onChange={e => {
             const newLang = Number(e.target.value);
             setLanguage(newLang);
             const tmpls = JSON.parse(activeQ.templates);
             // If switching lang, load its template (warning: overwrites code)
             if(confirm("Switching language will reset code. Proceed?")) setCode(tmpls[newLang] || "");
          }} style={styles.select}>
            {activeQ && JSON.parse(activeQ.templates || '{}') ? (
              Object.keys(JSON.parse(activeQ.templates)).map(id => {
                const l = SUPPORTED_LANGUAGES.find(x => x.id == id);
                return <option key={id} value={id}>{l ? l.name : id}</option>
              })
            ) : <option>Loading...</option>}
          </select>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
          <span style={{fontSize: '0.95rem', color: '#bbb'}}>👤 {user.username}</span>
          <div style={{fontSize:'1.2em', fontFamily:'monospace'}}>⏱️ {elapsed}</div>
          <button onClick={handleFinishContest} style={{...styles.btn, background:'#d9534f'}}> Finish Contest & Submit</button>
          <button onClick={logout} style={{...styles.btn, background: '#d9534f'}}>Logout</button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div style={styles.splitView}>
        {/* LEFT: Problem */}
        <div style={{flex: 1, padding:'20px', overflowY:'auto', borderRight:'1px solid #333'}}>
          {activeQ ? (
             <>
               <h1>{activeQ.title}</h1>
               <p style={{whiteSpace:'pre-wrap', lineHeight:'1.5'}}>{activeQ.description}</p>
             </>
          ) : <p>Loading...</p>}
        </div>

        {/* RIGHT: Editor */}
        <div style={{flex: 1.5, display:'flex', flexDirection:'column'}}>
          <div style={{flex: 1}}>
             <Editor 
               height="100%" 
               theme="vs-dark" 
               language={language === 71 ? "python" : "cpp"} // simplified mapping
               value={code} 
               onChange={handleSave}
             />
          </div>
          <div style={{height:'150px', background:'#1e1e1e', borderTop:'1px solid #333', display:'flex', flexDirection:'column'}}>
             <div style={{display:'flex', borderBottom:'1px solid #333'}}>
                <div style={{flex:1, padding:'5px', color:'#aaa'}}>Test Input</div>
                <div style={{flex:1, padding:'5px', color:'#aaa'}}>Output</div>
             </div>
             <div style={{flex:1, display:'flex'}}>
                <textarea value={customInput} onChange={e=>setCustomInput(e.target.value)} style={{...styles.terminal, borderRight:'1px solid #333'}} />
                <pre style={{...styles.terminal, color: output.includes('Error') ? 'red' : '#0f0'}}>{output}</pre>
             </div>
             <div style={{padding:'5px', textAlign:'right'}}>
               <button onClick={handleRun} disabled={isRunning} style={styles.btnPrimary}>{isRunning ? "Running..." : "▶ Run Code"}</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
//           4. MAIN APP ROUTER
// ==========================================
const App = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('session_token');

    if (!username || !token) return;

    api.get('/api/session', {
      headers: {
        username,
        session_token: token
      }
    })
    .then(res => {
      setUser({
        username: res.data.username,
        role: res.data.role
      });
      if (res.data.start_time) {
        localStorage.setItem('start_time', res.data.start_time);
      }
    })
    .catch(() => {
      localStorage.clear();
      setUser(null);
    });
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  if (!user) return <Login onLogin={setUser} />;
  return user.role === 'admin' ? <AdminDashboard /> : <StudentDashboard user={user} onLogout={handleLogout} />;
};

export default App;