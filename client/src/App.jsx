import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { api } from './api';
import Editor from '@monaco-editor/react';
import { useEffect } from 'react';

// --- COMPONENTS (We will separate these later) ---

function Login() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await api.post('/api/login', { username, pin });
      // Save info
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('username', res.data.username);

      if (res.data.role === 'ADMIN') navigate('/admin');
      else navigate('/contest');
    } catch (err) {
      alert(err.response?.data?.error || "Login Failed");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h1>🚀 Contest Login</h1>
        <input style={styles.input} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input style={styles.input} type="password" placeholder="Class PIN" value={pin} onChange={e => setPin(e.target.value)} />
        <button style={styles.btn} onClick={handleLogin}>ENTER</button>
      </div>
    </div>
  );
}

function StudentDashboard() {
  const [code, setCode] = useState("# Write your code here");
  const [config, setConfig] = useState({ autocomplete: true, highlighting: true });

  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [activeQuestion, setActiveQuestion] = useState(null);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Running...");
    
    try {
      const res = await api.post('/api/run', {
        code: code,
        language_id: 71, // Python (Hardcoded for now)
        stdin: "" // We will add an input box later
      });
      
      // If success, show output. If error, show the error message.
      setOutput(res.data.output);
    } catch (err) {
      setOutput("Error: " + (err.response?.data?.error || "Server Connection Failed"));
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    const username = localStorage.getItem('username');
    if (!username) return alert("Please log in again!");
    if (!activeQuestion) return;

    try {
      await api.post('/api/submit', {
        username: username,
        question_id: activeQuestion.id, // <--- DYNAMIC ID
        code: code,
        status: 'Completed' // We will make this "Pending" later when we add auto-grading
      });
      alert(`✅ Submitted for ${activeQuestion.title}!`);
    } catch (err) {
      alert("Submission Failed");
    }
  };

  // Poll for config changes every 5 seconds
  useEffect(() => {
    // Fetch Questions
    api.get('/api/questions').then(res => {
      setQuestions(res.data);
      if (res.data.length > 0) {
        setActiveQuestion(res.data[0]); // Select the first one by default
        setCode(res.data[0].template || "# Write your code here"); // Load template
      }
    });

    const fetchConfig = () => {
      api.get('/api/config').then(res => {
        // Only update if changed to avoid editor flickering
        setConfig(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(res.data)) {
            return res.data;
          }
          return prev;
        });
      }).catch(err => console.error("Config Poll Error:", err));
    };

    fetchConfig(); // Initial check
    const interval = setInterval(fetchConfig, 5000); // Check every 5s

    return () => clearInterval(interval); // Cleanup on exit
  }, []);

  // Monaco Configuration options
  const editorOptions = {
    fontSize: 16,
    minimap: { enabled: false },
    // "Hardcore Mode" toggles
    quickSuggestions: config.autocomplete, 
    suggestOnTriggerCharacters: config.autocomplete,
    parameterHints: { enabled: config.autocomplete },
    wordBasedSuggestions: config.autocomplete,
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1e1e1e', color: 'white' }}>
      
      {/* 1. TOP BAR */}
      <div style={{ padding: '10px 20px', background: '#252526', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
        <h2 style={{ margin: 0 }}>🚀 Contest Platform</h2>
        
        {/* Problem Selector */}
        <select 
          style={{ padding: '5px', background: '#3c3c3c', color: 'white', border: 'none', fontSize: '16px' }}
          onChange={(e) => {
            const q = questions.find(q => q.id === e.target.value);
            setActiveQuestion(q);
            setCode(q.template || ""); // Reset code when switching
          }}
          value={activeQuestion?.id || ""}
        >
          {questions.map(q => <option key={q.id} value={q.id}>{q.id}: {q.title}</option>)}
        </select>

        <span>{config.autocomplete ? "🟢 Assisted" : "🔴 Hardcore"}</span>
      </div>

      {/* 2. MAIN CONTENT AREA (Split 40/60) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* LEFT PANEL: Problem Description */}
        <div style={{ flex: '0 0 40%', padding: '20px', borderRight: '1px solid #333', overflowY: 'auto', background: '#1e1e1e' }}>
          {activeQuestion ? (
            <>
              <h1 style={{ marginTop: 0 }}>{activeQuestion.title}</h1>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#ccc' }}>
                {activeQuestion.description}
              </p>
            </>
          ) : <p>Loading questions...</p>}
        </div>

        {/* RIGHT PANEL: Editor & Output */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Editor */}
          <div style={{ flex: 2 }}>
            <Editor
              height="100%"
              theme="vs-dark"
              defaultLanguage="python"
              language={config.highlighting ? "python" : "plaintext"}
              value={code}
              onChange={setCode}
              options={editorOptions}
            />
          </div>

          {/* Terminal / Output */}
          <div style={{ flex: 1, background: '#111', padding: '15px', fontFamily: 'monospace', overflow: 'auto', borderTop: '1px solid #333' }}>
            <div style={{ color: '#888', marginBottom: '5px' }}>// TERMINAL</div>
            <pre style={{ margin: 0, color: '#0f0' }}>{output}</pre>
          </div>

          {/* Action Bar */}
          <div style={{ padding: '10px', background: '#252526', textAlign: 'right' }}>
            <button onClick={handleRun} disabled={isRunning} style={styles.btn}>
              {isRunning ? "Running..." : "▶ Run"}
            </button>
            <button onClick={handleSubmit} style={{...styles.btn, background: '#28a745', marginLeft: '10px'}}>
              Submit
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function AdminDashboard() {
  const [config, setConfig] = useState({ autocomplete: true, highlighting: true });

  const refreshConfig = () => {
    api.get('/api/config').then(res => setConfig(res.data));
  };
  
  const [submissions, setSubmissions] = useState([]);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/api/leaderboard');
      setSubmissions(res.data);
    } catch (err) { 
      console.error(err); 
    }
  };

  useEffect(() => {
    refreshConfig();
    fetchLeaderboard(); // <--- Add this
    
    // Auto-refresh leaderboard every 5 seconds
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleSetting = async (key) => {
    const newValue = !config[key];
    // Optimistic Update (Change UI instantly)
    setConfig(prev => ({ ...prev, [key]: newValue }));
    
    try {
      await api.post('/api/config', { key, value: newValue });
    } catch (err) {
      alert("Failed to save setting! Check server logs.");
      // Revert if failed
      setConfig(prev => ({ ...prev, [key]: !newValue }));
    }
  };

  return (
    <div style={{ padding: '40px', color: 'white' }}>
      <h1>👑 Admin Command Center</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
        
        {/* Contest Controls Card */}
        <div style={styles.box}>
          <h3>⚙️ Difficulty Settings</h3>
          
          <div style={localStyles.row}>
            <span>Autocomplete (IntelliSense)</span>
            <button 
              onClick={() => toggleSetting('autocomplete')}
              style={config.autocomplete ? localStyles.onBtn : localStyles.offBtn}
            >
              {config.autocomplete ? "ENABLED" : "DISABLED"}
            </button>
          </div>

          <div style={localStyles.row}>
            <span>Syntax Highlighting</span>
            <button 
              onClick={() => toggleSetting('highlighting')}
              style={config.highlighting ? localStyles.onBtn : localStyles.offBtn}
            >
              {config.highlighting ? "ENABLED" : "DISABLED"}
            </button>
          </div>
        </div>

        {/* Real Leaderboard */}
        <div style={styles.box}>
          <h3>🏆 Live Submissions</h3>
          {submissions.length === 0 ? (
            <p>No submissions yet...</p>
          ) : (
            <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{borderBottom: '1px solid #555'}}>
                  <th>User</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub, i) => (
                  <tr key={i} style={{borderBottom: '1px solid #333'}}>
                    <td style={{padding: '8px'}}>{sub.username}</td>
                    <td style={{padding: '8px', color: '#0f0'}}>{sub.status}</td>
                    <td style={{padding: '8px', fontSize: '0.8em', color: '#aaa'}}>
                      {new Date(sub.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

const localStyles = {
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '10px', background: '#333', borderRadius: '5px' },
  onBtn: { padding: '5px 15px', background: '#28a745', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' },
  offBtn: { padding: '5px 15px', background: '#dc3545', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }
};

// --- MAIN APP ---
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/contest" element={<StudentDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

// --- BASIC STYLES ---
const styles = {
  container: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1e1e1e', color: 'white' },
  box: { background: '#2d2d2d', padding: '40px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
  input: { display: 'block', width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: 'none' },
  btn: { padding: '10px 25px', background: '#007acc', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }
};
