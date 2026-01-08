import axios from 'axios';

// --- CONFIGURATION ---
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
// const API_URL = 'http://172.27.32.102:3000';
const API_URL = window.location.origin;
export const api = axios.create({ baseURL: API_URL });


// Supported Languages
export const SUPPORTED_LANGUAGES = [
  { id: 71, name: "Python (3.8.1)" },
  { id: 50, name: "C (GCC 9.2.0)" },
  { id: 54, name: "C++ (GCC 9.2.0)" },
  { id: 62, name: "Java (OpenJDK 13)" },
  { id: 63, name: "JavaScript (Node.js)" }
];

// Monaco Editor Language Map (add .monaco property if needed)
export const LANGUAGE_MAP = Object.fromEntries(
  SUPPORTED_LANGUAGES.map(l => [l.id, l.monaco || (l.id === 71 ? "python" : l.id === 63 ? "javascript" : "cpp")])
);
