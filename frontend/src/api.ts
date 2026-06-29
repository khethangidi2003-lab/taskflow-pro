// frontend/src/api.ts
const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://your-todo-api.onrender.com'  // ← Replace with your Render URL
    : 'http://localhost:5000';

export default API_BASE;