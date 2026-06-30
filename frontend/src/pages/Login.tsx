import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import API_BASE from '../api';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetStep, setResetStep] = useState<'username' | 'answer' | 'password'>('username');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/login`, { username, password });  // ← CHANGED
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('username', response.data.username);
        navigate('/dashboard');
      }
    } catch (err: any) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Login Failed', 
        text: err.response?.data?.message || 'Invalid credentials', 
        background: '#1a1a2e', 
        color: '#fff',
        confirmButtonColor: '#00d4ff'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get security question for the username
  const handleGetSecurityQuestion = async () => {
    if (!resetUsername) {
      Swal.fire({ icon: 'warning', title: 'Username Required', text: 'Please enter your username', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
      return;
    }

    setResetLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/get-security-question`, { username: resetUsername });  // ← CHANGED
      
      if (response.data.security_question) {
        setSecurityQuestion(response.data.security_question);
        setResetStep('answer');
      } else {
        Swal.fire({ 
          icon: 'error', 
          title: 'User Not Found', 
          text: 'No account found with that username', 
          background: '#1a1a2e', 
          color: '#fff',
          confirmButtonColor: '#00d4ff'
        });
      }
    } catch (err: any) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Error', 
        text: err.response?.data?.message || 'Something went wrong', 
        background: '#1a1a2e', 
        color: '#fff',
        confirmButtonColor: '#00d4ff'
      });
    } finally {
      setResetLoading(false);
    }
  };

  //Verify security answer
  const handleVerifyAnswer = async () => {
    if (!securityAnswer.trim()) {
      Swal.fire({ icon: 'warning', title: 'Answer Required', text: 'Please provide your security answer', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
      return;
    }

    setResetLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/verify-security-answer`, {   // ← CHANGED
        username: resetUsername, 
        answer: securityAnswer 
      });
      
      setResetToken(response.data.reset_token);
      setResetStep('password');
      
      Swal.fire({
        icon: 'success',
        title: 'Answer Correct!',
        text: 'You can now reset your password',
        background: '#1a1a2e',
        color: '#fff',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Verification Failed', 
        text: err.response?.data?.message || 'Incorrect answer', 
        background: '#1a1a2e', 
        color: '#fff',
        confirmButtonColor: '#00d4ff'
      });
    } finally {
      setResetLoading(false);
    }
  };

  //Reset password
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Swal.fire({ icon: 'warning', title: 'Invalid Password', text: 'Password must be at least 6 characters', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Swal.fire({ icon: 'warning', title: 'Password Mismatch', text: 'Passwords do not match', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
      return;
    }

    setResetLoading(true);
    try {
      await axios.post(`${API_BASE}/reset-password`, {   // ← CHANGED
        reset_token: resetToken, 
        new_password: newPassword 
      });
      
      Swal.fire({
        icon: 'success',
        title: 'Password Reset!',
        text: 'Your password has been updated. Please login with your new password.',
        background: '#1a1a2e',
        color: '#fff',
        confirmButtonColor: '#00d4ff'
      });
      
      closeModal();
    } catch (err: any) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Reset Failed', 
        text: err.response?.data?.message || 'Something went wrong', 
        background: '#1a1a2e', 
        color: '#fff',
        confirmButtonColor: '#00d4ff'
      });
    } finally {
      setResetLoading(false);
    }
  };

  const closeModal = () => {
    setShowResetModal(false);
    setResetStep('username');
    setResetUsername('');
    setSecurityQuestion('');
    setSecurityAnswer('');
    setNewPassword('');
    setConfirmNewPassword('');
    setResetToken('');
    setResetLoading(false);
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%',
        backgroundImage: `url('/images/security_background.png')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', zIndex: 1 }}></div>
        
        <div className="glass-card" style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '450px', margin: '20px' }}>
          <h2>Welcome</h2>
          <p className="subtitle">Sign in to continue to TaskFlow</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" required autoFocus />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: 'auto', padding: '4px 8px', margin: 0, background: 'transparent', color: '#00d4ff', fontSize: '12px' }}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
              <button type="button" onClick={() => setShowResetModal(true)} style={{ width: 'auto', padding: '4px 8px', margin: 0, fontSize: '0.75rem', background: 'transparent', color: '#00d4ff' }}>Forgot Password?</button>
            </div>

            <button type="submit" disabled={loading}>{loading ? <span className="spinner"></span> : 'Sign In'}</button>
          </form>

          <div className="link">Don't have an account? <Link to="/register">Sign Up</Link></div>
        </div>
      </div>

      {/*Forgot Password Modal*/}
      {showResetModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={closeModal}>
          <div className="glass-card" style={{ maxWidth: '400px', margin: '20px' }} onClick={(e) => e.stopPropagation()}>
            
            {/*Enter Username */}
            {resetStep === 'username' && (
              <>
                <h3>Reset Password</h3>
                <p className="subtitle">Enter your username to verify your identity</p>
                
                <div className="form-group">
                  <label>Username</label>
                  <input type="text" value={resetUsername} onChange={(e) => setResetUsername(e.target.value)} placeholder="Enter your username" autoFocus />
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                  <button onClick={handleGetSecurityQuestion} disabled={resetLoading} style={{ flex: 1 }}>
                    {resetLoading ? <span className="spinner"></span> : 'Continue'}
                  </button>
                  <button onClick={closeModal} style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>Cancel</button>
                </div>
              </>
            )}

            {/*Answer Security Question */}
            {resetStep === 'answer' && (
              <>
                <h3>Security Verification</h3>
                <p className="subtitle">Answer your security question</p>
                
                <div className="form-group">
                  <label>{securityQuestion}</label>
                  <input type="text" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder="Your answer" autoFocus />
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                  <button onClick={handleVerifyAnswer} disabled={resetLoading} style={{ flex: 1 }}>
                    {resetLoading ? <span className="spinner"></span> : 'Verify Answer'}
                  </button>
                  <button onClick={closeModal} style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>Cancel</button>
                </div>
              </>
            )}

            {/*Set New Password */}
            {resetStep === 'password' && (
              <>
                <h3>Set New Password</h3>
                <p className="subtitle">Create a new password for your account</p>
                
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" autoFocus />
                </div>
                
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Confirm your new password" />
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                  <button onClick={handleResetPassword} disabled={resetLoading} style={{ flex: 1 }}>
                    {resetLoading ? <span className="spinner"></span> : 'Reset Password'}
                  </button>
                  <button onClick={closeModal} style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Login;