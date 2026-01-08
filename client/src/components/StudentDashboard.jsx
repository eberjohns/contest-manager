import React, { useState, useEffect } from 'react';
import { styles } from '../styles';
import { SUPPORTED_LANGUAGES, LANGUAGE_MAP, api } from '../components/constants';
import Editor from "@monaco-editor/react";

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
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      height: '100vh',
      margin: 0,
      background: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* TOP BAR */}
      <header style={{
        padding: '20px 32px',
        background: '#18191a',
        borderBottom: '1px solid #222',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
          <h3 style={{color:'#fff'}}>Contest</h3>
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
          <div style={{fontSize:'1.2em', fontFamily:'monospace', color:'#fff'}}>⏱️ {elapsed}</div>
          <button onClick={handleFinishContest} style={{...styles.btn, background:'#d9534f'}}> Finish Contest & Submit</button>
          <button onClick={logout} style={{...styles.btn, background: '#d9534f'}}>Logout</button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        minHeight: 0,
        gap: '24px',
        padding: '32px',
        background: 'transparent',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 80px)', // leave space for header
      }}>
        {/* LEFT: Problem */}
        <div style={{flex: 1, padding:'20px', overflowY:'auto', borderRight:'1px solid #333', color:'#fff'}}>
          {activeQ ? (
             <>
               <h1>{activeQ.title}</h1>
               <p style={{whiteSpace:'pre-wrap', lineHeight:'1.5'}}>{activeQ.description}</p>
             </>
          ) : <p>Loading...</p>}
        </div>

        {/* RIGHT: Editor */}
        <div style={{flex: 1.5, display:'flex', flexDirection:'column', minHeight:0}}>
          <div style={{flex: 1, minHeight:0, display:'flex', flexDirection:'column'}}>
             <Editor 
               height="100%" 
               theme="vs-dark" 
               language={language === 71 ? "python" : "cpp"} // simplified mapping
               value={code} 
               onChange={handleSave}
             />
          </div>
          <div style={{
            height:'180px',
            background:'#18191a',
            borderTop:'1px solid #333',
            display:'flex',
            flexDirection:'row',
            gap:'24px',
            padding:'16px 0',
            minHeight:0,
            overflowY:'auto',
          }}>
            <div style={{flex:1, display:'flex', flexDirection:'column', marginRight:'12px', minHeight:0}}>
              <label style={{color:'#bbb', marginBottom:'6px', fontWeight:500}}>Test Input</label>
              <textarea 
                value={customInput} 
                onChange={e=>setCustomInput(e.target.value)} 
                style={{
                  width:'100%',
                  height:'100%',
                  background:'#232526',
                  color:'#fff',
                  border:'1px solid #444',
                  borderRadius:'8px',
                  fontFamily:'monospace',
                  fontSize:'1rem',
                  padding:'10px',
                  resize:'vertical',
                  minHeight:'80px',
                  boxSizing:'border-box',
                  overflowY:'auto',
                }}
              />
            </div>
            <div style={{flex:1, display:'flex', flexDirection:'column', marginLeft:'12px', minHeight:0}}>
              <label style={{color:'#bbb', marginBottom:'6px', fontWeight:500}}>Output</label>
              <pre 
                style={{
                  width:'100%',
                  height:'100%',
                  background:'#232526',
                  color: output.includes('Error') ? '#ff5252' : '#0f0',
                  border:'1px solid #444',
                  borderRadius:'8px',
                  fontFamily:'monospace',
                  fontSize:'1rem',
                  padding:'10px',
                  minHeight:'80px',
                  boxSizing:'border-box',
                  whiteSpace:'pre-wrap',
                  margin:0,
                  overflowY:'auto',
                }}
              >{output}</pre>
            </div>
            <div style={{display:'flex', flexDirection:'column', justifyContent:'flex-end', minHeight:0}}>
              <button onClick={handleRun} disabled={isRunning} style={{...styles.btnPrimary, minWidth:'120px'}}>{isRunning ? "Running..." : "▶ Run Code"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
