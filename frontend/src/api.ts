// frontend/src/api.ts
const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://taskflow-pro-4c3f.onrender.com'  // ← NEW
    : 'http://localhost:5000';

export default API_BASE;