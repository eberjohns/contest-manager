import React, { useState } from 'react';
import { styles } from '../styles';
import { api } from '../components/constants';

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
    }}>
      <div style={{
        padding: '40px 32px',
        background: '#fff',
        borderRadius: '16px',
        textAlign: 'center',
        width: '340px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        border: '1px solid #eee',
      }}>
        <h2 style={{marginBottom: 24, color: '#222', fontWeight: 700, letterSpacing: 1}}>Contest Platform</h2>
        <input 
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '14px',
            background: '#f7f7f7',
            border: '1px solid #ccc',
            color: '#222',
            borderRadius: '6px',
            fontSize: '1rem',
            boxSizing: 'border-box',
          }} 
          placeholder="Username" 
          value={username} 
          onChange={e => setUsername(e.target.value)} 
        />
        <input
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '14px',
            background: '#f7f7f7',
            border: '1px solid #ccc',
            color: '#222',
            borderRadius: '6px',
            fontSize: '1rem',
            boxSizing: 'border-box',
          }}
          placeholder="Class PIN"
          type="password"
          value={classPin}
          onChange={e => setClassPin(e.target.value)}
        />
        {error && <p style={{color: '#d32f2f', margin: '8px 0 0 0', fontWeight: 500}}>{error}</p>}
        <button style={{
          padding: '12px 28px',
          background: 'linear-gradient(90deg, #007bff 0%, #00c6ff 100%)',
          border: 'none',
          borderRadius: '6px',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '1rem',
          boxShadow: '0 2px 8px rgba(0,123,255,0.08)',
          transition: 'background 0.2s',
          width: '100%',
          marginTop: 12,
        }} onClick={handleLogin}>Enter Contest</button>
      </div>
    </div>
  );
};

export default Login;
