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
      localStorage.setItem('startTime', Date.now().toString()); // Record start time

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

  const [customInput, setCustomInput] = useState("");

  const [elapsed, setElapsed] = useState(0);

  const [questionStartTime, setQuestionStartTime] = useState(null);

  const formatTime = (elapsed) => {
    if (!elapsed) return "0:00";
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Running...");
    
    try {
      const res = await api.post('/api/run', {
        code: code,
        language_id: 71,
        stdin: customInput // <--- PASS THE INPUT HERE
      });
      setOutput(res.data.output + (res.data.error ? '\n' + res.data.error : ''));
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

    const startTime = localStorage.getItem('startTime');
    const elapsed = startTime ? Date.now() - parseInt(startTime) : 0;

    try {
      await api.post('/api/submit', {
        username: username,
        question_id: activeQuestion.id, // <--- DYNAMIC ID
        code: code,
        elapsed_time: elapsed
      });
      alert(`✅ Submitted for ${activeQuestion.title} in ${formatTime(elapsed)}!`);
    } catch (err) {
      alert("Submission Failed");
    }
  };

  // Poll for config changes every 5 seconds
  useEffect(() => {
    // Fetch Questions
    const fetchQuestions = () => {
      api.get('/api/questions').then(res => {
        setQuestions(res.data);
        // Do not reset activeQuestion or code to avoid overwriting user input
      }).catch(err => console.error("Questions Poll Error:", err));
    };

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

    // Initial fetch
    api.get('/api/questions').then(res => {
      setQuestions(res.data);
      if (res.data.length > 0) {
        setActiveQuestion(res.data[0]); // Select the first one by default
        setCode(res.data[0].template || "# Write your code here"); // Load template
      }
    });

    fetchConfig(); // Initial check
    const interval = setInterval(() => {
      fetchQuestions();
      fetchConfig();
    }, 5000); // Check every 5s

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

  // Timer effect
  useEffect(() => {
    const startTime = localStorage.getItem('startTime');
    if (startTime) {
      const interval = setInterval(() => {
        setElapsed(Date.now() - parseInt(startTime));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []);

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
        <span style={{ marginLeft: '20px', color: '#0f0' }}>⏱️ {formatTime(elapsed)}</span>
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
          
          {/* Editor (50% height) */}
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

          {/* INPUT BOX (New!) */}
          <div style={{ height: '100px', background: '#1e1e1e', padding: '10px', borderTop: '1px solid #333' }}>
             <div style={{ color: '#888', marginBottom: '5px', fontSize: '0.8em' }}>STDIN (Input for your code)</div>
             <textarea 
                style={{ width: '100%', height: '60px', background: '#252526', color: 'white', border: '1px solid #444', fontFamily: 'monospace' }}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter input here (e.g. 10 20)"
             />
          </div>

          {/* OUTPUT BOX */}
          <div style={{ flex: 1, background: '#111', padding: '15px', fontFamily: 'monospace', overflow: 'auto', borderTop: '1px solid #333' }}>
            <div style={{ color: '#888', marginBottom: '5px' }}>// TERMINAL OUTPUT</div>
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

const AdminDashboard = ({ api }) => {
  const [tab, setTab] = useState('leaderboard');
  const [submissions, setSubmissions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [blindMode, setBlindMode] = useState(false);
  const [autocomplete, setAutocomplete] = useState(true);
  const [highlighting, setHighlighting] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // Loading state

  const formatTime = (elapsed) => {
    if (!elapsed) return "N/A";
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Smart Form State
  const [newQ, setNewQ] = useState({ 
    title: '', 
    description: '', 
    template: '', 
    solution: '',  // The Golden Code
    inputs: ['']   // List of inputs
  });

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => { if(tab==='leaderboard') fetchLeaderboard(); }, 5000);
    return () => clearInterval(interval);
  }, [tab]);

  const refreshData = async () => {
    fetchLeaderboard();
    fetchQuestions();
    fetchSettings();
  };

  const fetchLeaderboard = async () => {
    try { const res = await api.get('/api/leaderboard'); setSubmissions(res.data); } catch(e){}
  };
  const fetchQuestions = async () => {
    try { const res = await api.get('/api/questions'); setQuestions(res.data); } catch(e){}
  };
  const fetchSettings = async () => {
    try { const res = await api.get('/api/settings'); setBlindMode(res.data.blind_mode); } catch(e){}
    try { const res = await api.get('/api/config'); setAutocomplete(res.data.autocomplete); setHighlighting(res.data.highlighting); } catch(e){}
  };

  const toggleBlindMode = async () => {
    await api.post('/api/settings', { blind_mode: !blindMode });
    setBlindMode(!blindMode);
  };

  const toggleAutocomplete = async () => {
    await api.post('/api/config', { key: 'autocomplete', value: !autocomplete });
    setAutocomplete(!autocomplete);
  };

  const toggleHighlighting = async () => {
    await api.post('/api/config', { key: 'highlighting', value: !highlighting });
    setHighlighting(!highlighting);
  };

  const handleDelete = async (id) => {
    if(!confirm("Delete?")) return;
    await api.delete(`/api/questions/${id}`);
    fetchQuestions();
  };

  // --- SMART INPUT HANDLERS ---
  const handleAddInput = () => {
    setNewQ({ ...newQ, inputs: [...newQ.inputs, ''] });
  };

  const handleInputChange = (index, value) => {
    const updatedInputs = [...newQ.inputs];
    updatedInputs[index] = value;
    setNewQ({ ...newQ, inputs: updatedInputs });
  };

  const handleSaveSmartQuestion = async () => {
    if (!newQ.title || !newQ.solution) return alert("Title and Reference Solution are required!");
    
    setIsProcessing(true);
    try {
      await api.post('/api/questions', {
        title: newQ.title,
        description: newQ.description,
        template: newQ.template,
        solution_code: newQ.solution,
        test_inputs: newQ.inputs.filter(i => i.trim() !== "") // Remove empty inputs
      });
      
      alert("✅ Question Created & Verified!");
      // Reset Form
      setNewQ({ title: '', description: '', template: '', solution: '', inputs: [''] });
      fetchQuestions();
    } catch (err) {
      alert("❌ Error: " + (err.response?.data?.error || "Failed to create"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ padding: '20px', color: 'white', fontFamily: 'sans-serif' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>👑 Admin Control</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={toggleBlindMode} style={{ ...styles.btn, background: blindMode ? '#d9534f' : '#333' }}>
            {blindMode ? "🚫 Blind Mode: ON" : "👁️ Blind Mode: OFF"}
          </button>
          <button onClick={toggleAutocomplete} style={{ ...styles.btn, background: autocomplete ? '#28a745' : '#333' }}>
            {autocomplete ? "🟢 Autocomplete: ON" : "🔴 Autocomplete: OFF"}
          </button>
          <button onClick={toggleHighlighting} style={{ ...styles.btn, background: highlighting ? '#28a745' : '#333' }}>
            {highlighting ? "🟢 Highlighting: ON" : "🔴 Highlighting: OFF"}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #444' }}>
        <button onClick={() => setTab('leaderboard')} style={{ padding: '10px', background: tab==='leaderboard'?'#444':'transparent', color:'white', border:'none' }}>🏆 Leaderboard</button>
        <button onClick={() => setTab('questions')} style={{ padding: '10px', background: tab==='questions'?'#444':'transparent', color:'white', border:'none' }}>📝 Questions</button>
      </div>

      {/* LEADERBOARD TAB */}
      {tab === 'leaderboard' ? (
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', background: '#252526' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #555' }}><th>User</th><th>Problem</th><th>Status</th><th>Time Taken</th></tr>
          </thead>
          <tbody>
            {submissions.map((sub, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '8px' }}>{sub.username}</td>
                <td style={{ padding: '8px', color: '#4da6ff' }}>{sub.title || "Unknown"}</td>
                <td style={{ padding: '8px', color: sub.status === 'Accepted' ? '#0f0' : '#f00' }}>{sub.status}</td>
                <td style={{ padding: '8px', color: '#aaa' }}>{formatTime(sub.elapsed_time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* LIST QUESTIONS */}
          <div style={{ flex: 1 }}>
            <h3>Active Questions</h3>
            {questions.map(q => (
              <div key={q.id} style={{ background: '#333', padding: '10px', marginBottom: '5px', display:'flex', justifyContent:'space-between' }}>
                <span>{q.title}</span>
                <button onClick={() => handleDelete(q.id)} style={{color:'red', background:'none', border:'none', cursor:'pointer'}}>X</button>
              </div>
            ))}
          </div>

          {/* SMART ADD FORM */}
          <div style={{ flex: 1.5, background: '#252526', padding: '20px' }}>
            <h3>✨ Add Smart Question</h3>
            <input placeholder="Title" value={newQ.title} onChange={e => setNewQ({...newQ, title: e.target.value})} style={styles.input} /><br/><br/>
            
            <textarea placeholder="Description" value={newQ.description} onChange={e => setNewQ({...newQ, description: e.target.value})} style={{...styles.input, height: '60px'}} /><br/><br/>
            
            <div style={{display:'flex', gap:'10px'}}>
              <textarea placeholder="Student Template (e.g. print(input()))" value={newQ.template} onChange={e => setNewQ({...newQ, template: e.target.value})} style={{...styles.input, height: '100px', fontFamily:'monospace'}} />
              <textarea placeholder="✅ Reference Solution (Correct Python Code)" value={newQ.solution} onChange={e => setNewQ({...newQ, solution: e.target.value})} style={{...styles.input, height: '100px', fontFamily:'monospace', border:'1px solid #0f0'}} />
            </div><br/>

            <h4>Test Inputs (Multiple lines allowed per case)</h4>
            {newQ.inputs.map((input, idx) => (
              <div key={idx} style={{marginBottom:'5px'}}>
                <textarea 
                  placeholder={`Test Case ${idx+1} Input (e.g. 10\n20)`} 
                  value={input} 
                  onChange={(e) => handleInputChange(idx, e.target.value)} 
                  style={{...styles.input, width: '80%', height: '60px', fontFamily: 'monospace'}} 
                />
              </div>
            ))}
            <button onClick={handleAddInput} style={{background:'#444', color:'white', border:'none', padding:'5px 10px'}}>+ Add Another Case</button>
            <br/><br/>

            <button onClick={handleSaveSmartQuestion} disabled={isProcessing} style={{...styles.btn, background: isProcessing ? '#666' : '#28a745', width:'100%'}}>
              {isProcessing ? "⏳ Verifying & Generating Outputs..." : "💾 Auto-Generate & Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
        <Route path="/admin" element={<AdminDashboard api={api} />} />
      </Routes>
    </BrowserRouter>
  );
}

// --- BASIC STYLES ---
const styles = {
  container: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1e1e1e', color: 'white' },
  box: { background: '#2d2d2d', padding: '40px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
  input: { width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: 'white' },
  btn: { padding: '10px 20px', border: 'none', color: 'white', cursor: 'pointer', background: '#007bff' }
};
