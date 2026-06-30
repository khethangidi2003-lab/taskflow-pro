import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import API_BASE from '../api';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const navigate = useNavigate();

  //Security questions
  const securityQuestions = [
    "What is your mother's maiden name?",
    "What was the name of your first pet?",
    "What was your first car?",
    "What city were you born in?",
    "What is your favorite book?",
    "What was your elementary school name?",
    "What is your father's middle name?",
    "What was your first job?",
    "What is your favorite movie?",
    "What is your best friend's name?"
  ];

  const getPasswordStrength = (pass: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
    if (score <= 3) return { score, label: 'Medium', color: '#f59e0b' };
    return { score, label: 'Strong', color: '#10b981' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password !== confirmPassword) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Passwords do not match', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Password must be at least 6 characters', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
      setLoading(false);
      return;
    }

    if (username.length < 3) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Username must be at least 3 characters', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Please enter a valid email address', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
      setLoading(false);
      return;
    }

    if (!selectedQuestion) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Please select a security question', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
      setLoading(false);
      return;
    }

    if (!securityAnswer.trim()) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Please provide an answer to your security question', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/register`, {
        username,
        email,
        password,
        security_question: selectedQuestion,
        security_answer: securityAnswer
      });

      if (response.status === 201) {
        await Swal.fire({ icon: 'success', title: 'Account Created!', text: 'Your account has been created successfully', background: '#1a1a2e', color: '#fff', timer: 2000, showConfirmButton: false });
        navigate('/login');
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Registration Failed', text: err.response?.data?.message || 'Something went wrong', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%',
      backgroundImage: `url('/images/security_background.png')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', zIndex: 1 }}></div>
      
      <div className="glass-card" style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '500px', margin: '20px' }}>
        <h2>Create Account</h2>
        <p className="subtitle">Join TaskFlow and stay organized</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username (min 3 characters)" required autoFocus />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: 'auto', padding: '4px 8px', margin: 0, background: 'transparent', color: '#00d4ff', fontSize: '12px' }}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
            {password && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${(passwordStrength.score / 5) * 100}%`, height: '100%', background: passwordStrength.color, transition: 'width 0.3s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', color: passwordStrength.color }}>
                  <span>Strength: {passwordStrength.label}</span>
                  <span>{password.length} chars</span>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: 'auto', padding: '4px 8px', margin: 0, background: 'transparent', color: '#00d4ff', fontSize: '12px' }}>{showConfirmPassword ? 'Hide' : 'Show'}</button>
            </div>
          </div>

          {/* Security Question Section */}
          <div className="form-group">
            <label>Security Question</label>
            <select value={selectedQuestion} onChange={(e) => setSelectedQuestion(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.2)', color: '#fff' }}>
              <option value="">Select a security question</option>
              {securityQuestions.map((q, idx) => (
                <option key={idx} value={q}>{q}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Your Answer</label>
            <input type="text" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder="Your answer (used to reset password)" required />
            <small style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', marginTop: '4px' }}>Keep this answer safe - you'll need it to reset your password</small>
          </div>

          <button type="submit" disabled={loading}>{loading ? <span className="spinner"></span> : 'Sign Up'}</button>
        </form>

        <div className="link">Already have an account? <Link to="/login">Sign In</Link></div>
      </div>
    </div>
  );
};

export default Register;