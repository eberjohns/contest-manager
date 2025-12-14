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

  // Poll for config changes every 5 seconds
  useEffect(() => {
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
      {/* Header */}
      <div style={{ padding: '10px 20px', background: '#2d2d2d', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
        <h2>📝 Contest Area</h2>
        <div>
          <span>Mode: {config.autocomplete ? "Assisted" : "Hardcore"}</span>
        </div>
      </div>

      {/* The Editor */}
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          theme="vs-dark"
          // If highlighting is OFF, we trick it by saying the language is "plaintext"
          defaultLanguage="python"
          language={config.highlighting ? "python" : "plaintext"}
          value={code}
          onChange={(value) => setCode(value)}
          options={editorOptions}
        />
      </div>
      
      {/* Action Bar */}
      <div style={{ padding: '10px', background: '#252526', textAlign: 'right' }}>
         <button style={styles.btn}>Run Code</button>
         <button style={{...styles.btn, background: '#28a745', marginLeft: '10px'}}>Submit</button>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [config, setConfig] = useState({ autocomplete: true, highlighting: true });

  
  const refreshConfig = () => {
    api.get('/api/config').then(res => setConfig(res.data));
  };
  
  useEffect(() => {
    refreshConfig();
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

        {/* Leaderboard Placeholder */}
        <div style={styles.box}>
          <h3>🏆 Live Leaderboard</h3>
          <p>No submissions yet...</p>
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
