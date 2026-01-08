
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import StudentDashboard from './components/StudentDashboard';
import { api } from './components/constants';

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
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: 0,
    }}>
      {user.role === 'admin' ? (
        <AdminDashboard onLogout={handleLogout} />
      ) : (
        <StudentDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;