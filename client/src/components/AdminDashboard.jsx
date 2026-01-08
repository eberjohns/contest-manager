import React, { useState, useEffect } from 'react';
import { styles } from '../styles';
import { SUPPORTED_LANGUAGES, LANGUAGE_MAP, api } from '../components/constants';
import Editor from "@monaco-editor/react";

// ==========================================
//           2. ADMIN DASHBOARD
// ==========================================
const AdminDashboard = ({ onLogout }) => {
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
    try { const res = await api.get('/api/admin/questions'); setQuestions(res.data); } catch(e){}
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

  const [codeModal, setCodeModal] = useState(null);
  const [submissionsModal, setSubmissionsModal] = useState(null);

  const openCodeModal = async (username, questionId) => {
    try {
      const res = await api.get('/api/admin/submission-code', {
        params: { username, question_id: questionId }
      });
      setCodeModal(res.data);
    } catch (err) {
      alert("Failed to load submitted code");
    }
  };

  const openSubmissionsListModal = async (username) => {
    try {
        const res = await api.get(`/api/admin/submissions/${username}`);
        if (!Array.isArray(res.data)) {
            console.error("API did not return an array for submissions:", res.data);
            alert("Error: submissions data is not in the expected format.");
            setSubmissionsModal({ username, submissions: [] }); // Set to empty array to prevent crash
            return;
        }
        setSubmissionsModal({ username, submissions: res.data });
    } catch (err) {
        console.error("Failed to load submissions:", err);
        alert('Failed to load submissions for user.');
    }
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
      {codeModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modal}>
            <h3>{codeModal.title}</h3>

            <Editor
              height="400px"
              theme="vs-dark"
              language={LANGUAGE_MAP[codeModal.language_id] || "plaintext"}
              value={codeModal.code}
              options={{ readOnly: true }}
            />

            <button
              style={{ ...styles.btnPrimary, marginTop: '10px' }}
              onClick={() => setCodeModal(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {submissionsModal && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modal}>
            <h3>Submissions for {submissionsModal.username}</h3>
            {Array.isArray(submissionsModal.submissions) && submissionsModal.submissions.map(sub => (
              <div key={sub.question_id} style={{ ...styles.card, justifyContent: 'space-between' }}>
                <span>{sub.title}</span>
                <button
                  onClick={() => openCodeModal(submissionsModal.username, sub.question_id)}
                  style={styles.btnSmall}
                >
                  View Code
                </button>
              </div>
            ))}
            <button
              style={{ ...styles.btnPrimary, marginTop: '10px' }}
              onClick={() => setSubmissionsModal(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <header style={{
        padding: '20px 32px',
        background: '#18191a',
        borderBottom: '1px solid #222',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{color:'#fff'}}>Admin Console</h1>
        <div style={{display:'flex', gap:'10px'}}>
          <button onClick={() => toggleSetting('blind_mode')} style={{...styles.btn, background: settings.blind_mode ? '#d9534f' : '#333'}}>
            {settings.blind_mode ? "Blind Mode: ON" : "Blind Mode: OFF"}
          </button>
          <button onClick={() => toggleSetting('contest_active')} style={{...styles.btn, background: settings.contest_active ? '#28a745' : '#d9534f'}}>
            {settings.contest_active ? "Contest: OPEN" : "Contest: CLOSED"}
          </button>
          <button onClick={handleReset} style={{...styles.btn, background: 'red'}}>Reset</button>
          {/* <button onClick={logout} style={{...styles.btn, background: 'red'}}>Logout</button> */}
        </div>
      </header>

      <div style={{...styles.tabs, background:'#232526'}}>
        <button onClick={() => setTab('leaderboard')} style={tab==='leaderboard'?styles.activeTab:styles.tab}>Leaderboard</button>
        <button onClick={() => setTab('questions')} style={tab==='questions'?styles.activeTab:styles.tab}>Manage Questions</button>
      </div>

      {tab === 'leaderboard' ? (
        <table style={{...styles.table, background:'#232526', color:'#fff'}}>
          <thead>
            <tr><th>Rank</th><th>User</th><th>Solved</th><th>Time</th><th>View Code</th></tr>
          </thead>
          <tbody>
            {submissions.map((sub, i) => (
              <tr key={i}>
                <td style={{ textAlign: 'center' }}>{i+1}</td>
                <td style={{ textAlign: 'center' }}>{sub.username}</td>
                <td style={{ textAlign: 'center', color:'#0f0'}}>{sub.solved} / {questions.length}</td>
                <td style={{ textAlign: 'center' }}>{sub.timeStr}</td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => openSubmissionsListModal(sub.username)}
                    style={styles.btnSmall}
                  >
                        👁
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{...styles.splitView, background:'#232526'}}>
          <div style={{flex:1, overflowY:'auto', color:'#fff'}}>
            <h3>Existing Questions</h3>
            {questions.map(q => (
              <div key={q.id} style={styles.card}>
                <div style={{fontWeight:'bold'}}>{q.title}</div>
                <button
                  onClick={async () => {
                    await api.post(`/api/questions/${q.id}/toggle`);
                    fetchQuestions();
                  }}
                  style={{
                    ...styles.btnSmall,
                    background: q.is_enabled ? '#d9534f' : '#28a745'
                  }}
                >
                  {q.is_enabled ? 'Disable' : 'Enable'}
                </button>
                <button onClick={async () => { if(confirm("Delete?")) { await api.delete(`/api/questions/${q.id}`); fetchQuestions(); }}} style={{color:'red', background:'none', border:'none'}}>Delete</button>
              </div>
            ))}
          </div>

          <div style={{flex:2, background:'#18191a', padding:'24px 32px', borderRadius:'12px', overflowY:'auto', color:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,0.10)'}}>
            <h3 style={{marginBottom:'18px', fontWeight:700}}>Add Smart Question</h3>
            <label style={{color:'#bbb', marginBottom:'6px', fontWeight:500}}>Title</label>
            <input 
              placeholder="Title" 
              value={newQ.title} 
              onChange={e=>setNewQ({...newQ, title:e.target.value})} 
              style={{
                width:'100%',
                padding:'12px',
                marginBottom:'14px',
                background:'#232526',
                color:'#fff',
                border:'1px solid #444',
                borderRadius:'8px',
                fontSize:'1rem',
                boxSizing:'border-box',
              }}
            />
            <label style={{color:'#bbb', marginBottom:'6px', fontWeight:500}}>Description</label>
            <textarea 
              placeholder="Description" 
              value={newQ.description} 
              onChange={e=>setNewQ({...newQ, description:e.target.value})} 
              style={{
                width:'100%',
                padding:'12px',
                marginBottom:'14px',
                background:'#232526',
                color:'#fff',
                border:'1px solid #444',
                borderRadius:'8px',
                fontSize:'1rem',
                boxSizing:'border-box',
                minHeight:'60px',
                resize:'vertical',
              }}
            />
            <label style={{color:'#bbb', marginBottom:'6px', fontWeight:500}}>Golden Solution (Python 3)</label>
            <textarea 
              placeholder="def solve(): ..." 
              value={newQ.solution} 
              onChange={e=>setNewQ({...newQ, solution:e.target.value})} 
              style={{
                width:'100%',
                padding:'12px',
                marginBottom:'14px',
                background:'#232526',
                color:'#fff',
                border:'1px solid #28a745',
                borderRadius:'8px',
                fontFamily:'monospace',
                fontSize:'1rem',
                boxSizing:'border-box',
                minHeight:'100px',
                resize:'vertical',
              }}
            />
            <label style={{color:'#bbb', marginBottom:'6px', fontWeight:500}}>Test Inputs (for generating outputs)</label>
            {newQ.inputs.map((inp, i) => (
              <div key={i} style={{marginBottom:'8px'}}>
                <textarea
                  value={inp}
                  onChange={e => {
                    const up = [...newQ.inputs];
                    up[i] = e.target.value;
                    setNewQ({ ...newQ, inputs: up });
                  }}
                  placeholder={`Test Case ${i + 1} (multiline allowed)`}
                  style={{
                    width:'100%',
                    padding:'12px',
                    background:'#232526',
                    color:'#fff',
                    border:'1px solid #444',
                    borderRadius:'8px',
                    fontFamily:'monospace',
                    fontSize:'1rem',
                    boxSizing:'border-box',
                    minHeight:'80px',
                    resize:'vertical',
                  }}
                />
              </div>
            ))}
            <button onClick={()=>setNewQ({...newQ, inputs:[...newQ.inputs, '']})} style={{...styles.btnSmall, marginBottom:'12px'}}>+ Add Case</button>
            <label style={{color:'#bbb', marginBottom:'6px', fontWeight:500}}>Allowed Languages & Templates</label>
            <div style={{display:'flex', gap:'5px', flexWrap:'wrap', margin:'5px 0 12px 0'}}>
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
                     style={{
                       width:'100%',
                       padding:'12px',
                       background:'#232526',
                       color:'#fff',
                       border:'1px solid #444',
                       borderRadius:'8px',
                       fontFamily:'monospace',
                       fontSize:'1rem',
                       boxSizing:'border-box',
                       minHeight:'60px',
                       resize:'vertical',
                     }}
                   />
                 </div>
               )
            })}
            <button onClick={handleSaveQuestion} disabled={loading} style={{...styles.btnPrimary, marginTop:'24px', width:'100%'}}>
              {loading ? "Validating..." : "Auto-Verify & Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
