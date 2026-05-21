import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import Swal from 'sweetalert2';
import { Todo } from '../types/todo';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userSecurityQuestion, setUserSecurityQuestion] = useState('');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newDueDate, setNewDueDate] = useState<Date | null>(null);
  const [newDueTime, setNewDueTime] = useState('');
  const [newPriority, setNewPriority] = useState<Todo['priority'] | ''>('');
  const [editText, setEditText] = useState('');
  const [editDueDate, setEditDueDate] = useState<Date | null>(null);
  const [editDueTime, setEditDueTime] = useState('');
  const [editPriority, setEditPriority] = useState<Todo['priority']>('medium');
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<Todo['priority'] | 'all'>('all');
  const [filterDueDate, setFilterDueDate] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  
  // Profile dropdown states
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPasswordChange, setNewPasswordChange] = useState('');
  const [confirmNewPasswordChange, setConfirmNewPasswordChange] = useState('');
  
  const itemsPerPage = 3;
  const navigate = useNavigate();

  // Get user profile from localStorage
  const getUserProfile = () => {
    const currentUser = localStorage.getItem('username');
    const savedProfile = localStorage.getItem(`user_${currentUser}_profile`);
    
    if (savedProfile) {
      const userData = JSON.parse(savedProfile);
      setUserEmail(userData.email || 'Not provided');
      setUserSecurityQuestion(userData.security_question || 'Not set');
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
    }
  };

  // Handle change password
  const handleChangePassword = async () => {
    if (!oldPassword) {
      Swal.fire({ icon: 'warning', title: 'Current Password Required', text: 'Please enter your current password', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
      return;
    }

    if (!newPasswordChange || newPasswordChange.length < 6) {
      Swal.fire({ icon: 'warning', title: 'Invalid Password', text: 'New password must be at least 6 characters', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
      return;
    }

    if (newPasswordChange !== confirmNewPasswordChange) {
      Swal.fire({ icon: 'warning', title: 'Password Mismatch', text: 'New passwords do not match', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
      return;
    }

    setResetLoading(true);
    try {
      // Verify old password first
      await axios.post('http://localhost:5000/login', { 
        username: user, 
        password: oldPassword 
      });
      
      // Get security question
      const questionResponse = await axios.post('http://localhost:5000/get-security-question', { username: user });
      
      if (questionResponse.data.security_question) {
        const { value: securityAnswer } = await Swal.fire({
          title: 'Security Verification',
          text: questionResponse.data.security_question,
          input: 'text',
          inputPlaceholder: 'Your answer',
          background: '#1a1a2e',
          color: '#fff',
          confirmButtonColor: '#00d4ff',
          showCancelButton: true
        });
        
        if (securityAnswer) {
          const verifyResponse = await axios.post('http://localhost:5000/verify-security-answer', { 
            username: user, 
            answer: securityAnswer
          });
          
          if (verifyResponse.data.reset_token) {
            await axios.post('http://localhost:5000/reset-password', { 
              reset_token: verifyResponse.data.reset_token, 
              new_password: newPasswordChange 
            });
            
            Swal.fire({
              icon: 'success',
              title: 'Password Changed!',
              text: 'Your password has been updated successfully',
              background: '#1a1a2e',
              color: '#fff',
              confirmButtonColor: '#00d4ff'
            });
            
            setShowChangePasswordModal(false);
            setOldPassword('');
            setNewPasswordChange('');
            setConfirmNewPasswordChange('');
          }
        }
      }
    } catch (err: any) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Change Failed', 
        text: err.response?.data?.message || 'Current password is incorrect', 
        background: '#1a1a2e', 
        color: '#fff',
        confirmButtonColor: '#00d4ff'
      });
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get('http://localhost:5000/protected', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setUser(response.data.user);
        
        const savedTodos = localStorage.getItem(`todos_${response.data.user}`);
        if (savedTodos) {
          setTodos(JSON.parse(savedTodos));
        }
        
        // Load user profile
        getUserProfile();
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`todos_${user}`, JSON.stringify(todos));
    }
  }, [todos, user]);

  const getFilteredTodos = () => {
    let filtered = [...todos];
    
    if (searchTerm.trim()) {
      filtered = filtered.filter(t => 
        t.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }
    
    if (filterDueDate !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(t => {
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        
        if (filterDueDate === 'overdue') {
          return due < today;
        } else if (filterDueDate === 'today') {
          return due.getTime() === today.getTime();
        } else if (filterDueDate === 'tomorrow') {
          return due.getTime() === today.getTime() + 86400000;
        } else if (filterDueDate === 'week') {
          const weekFromNow = today.getTime() + (7 * 86400000);
          return due.getTime() >= today.getTime() && due.getTime() <= weekFromNow;
        }
        return true;
      });
    }
    
    filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    return filtered;
  };

  const getDueStatus = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    if (due < today) return 'overdue';
    if (due.getTime() === today.getTime()) return 'today';
    if (due.getTime() === today.getTime() + 86400000) return 'tomorrow';
    return 'future';
  };

  const filteredTodos = getFilteredTodos();
  const totalPages = Math.ceil(filteredTodos.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTodos = filteredTodos.slice(indexOfFirstItem, indexOfLastItem);

  const addTodo = () => {
  if (!newTodo.trim()) {
    Swal.fire({ icon: 'warning', title: 'Task Required', text: 'Please enter a task description', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
    return;
  }
  
  if (!newPriority) {
    Swal.fire({ icon: 'warning', title: 'Priority Required', text: 'Please select a priority level', background: '#1a1a2e', color: '#fff', confirmButtonColor: '#00d4ff' });
    return;
  }
  
  const dueDateStr = newDueDate ? newDueDate.toISOString().split('T')[0] : '';
  const dueTimeStr = newDueTime || '';
  
  const newTodoItem: Todo = {
    id: Date.now(),
    text: newTodo,
    completed: false,
    dueDate: dueDateStr,
    dueTime: dueTimeStr,
    priority: newPriority,
    isEditing: false
  };
  setTodos([...todos, newTodoItem]);
  setNewTodo('');
  setNewDueDate(null);
  setNewDueTime('');
  setNewPriority('');
  
  Swal.fire({ icon: 'success', title: 'Task Added!', text: 'Your task has been created', background: '#1a1a2e', color: '#fff', timer: 1500, showConfirmButton: false });
};

  const startEdit = (todo: Todo) => {
    setTodos(todos.map(t =>
      t.id === todo.id ? { ...t, isEditing: true } : t
    ));
    setEditText(todo.text);
    setEditDueDate(todo.dueDate ? new Date(todo.dueDate) : null);
    setEditDueTime(todo.dueTime || '');
    setEditPriority(todo.priority);
  };

  const saveEdit = (id: number) => {
    if (editText.trim()) {
      setTodos(todos.map(todo =>
        todo.id === id ? {
          ...todo,
          text: editText,
          dueDate: editDueDate ? editDueDate.toISOString().split('T')[0] : '',
          dueTime: editDueTime,
          priority: editPriority,
          isEditing: false
        } : todo
      ));
      Swal.fire({ icon: 'success', title: 'Task Updated!', text: 'Changes saved successfully', background: '#1a1a2e', color: '#fff', timer: 1500, showConfirmButton: false });
    }
  };

  const cancelEdit = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, isEditing: false } : todo
    ));
  };

  const deleteTodo = async (id: number) => {
    const result = await Swal.fire({
      title: 'Delete Task?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      background: '#1a1a2e',
      color: '#fff'
    });
    
    if (result.isConfirmed) {
      setTodos(todos.filter(todo => todo.id !== id));
      if (currentTodos.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
      Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Task has been deleted', background: '#1a1a2e', color: '#fff', timer: 1500, showConfirmButton: false });
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
    const todo = todos.find(t => t.id === id);
    const status = !todo?.completed;
    Swal.fire({ 
      icon: 'success', 
      title: status ? 'Task Completed!' : 'Task Reopened', 
      text: status ? 'Great job! Keep going!' : 'Task has been reopened',
      background: '#1a1a2e', 
      color: '#fff', 
      timer: 1200, 
      showConfirmButton: false 
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const getTodosByDate = () => {
    const grouped: { [key: string]: Todo[] } = {};
    filteredTodos.forEach(todo => {
      if (todo.dueDate && todo.dueDate !== '') {
        if (!grouped[todo.dueDate]) {
          grouped[todo.dueDate] = [];
        }
        grouped[todo.dueDate].push(todo);
      }
    });
    return grouped;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const goToPrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    setCalendarYear(new Date().getFullYear());
    setCalendarMonth(new Date().getMonth());
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
    const todosByDate = getTodosByDate();
    const today = new Date();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTodos = todosByDate[dateStr] || [];
      const isToday = calendarYear === today.getFullYear() && 
                      calendarMonth === today.getMonth() && 
                      day === today.getDate();
      
      days.push(
        <div 
          key={day} 
          className={`calendar-day ${dayTodos.length > 0 ? 'has-tasks' : ''} ${isToday ? 'today' : ''}`}
          onMouseEnter={() => setHoveredDate(dateStr)}
          onMouseLeave={() => setHoveredDate(null)}
        >
          <div className="calendar-day-number">{day}</div>
          {dayTodos.length > 0 && (
            <div className="calendar-day-tasks">
              {dayTodos.length}
            </div>
          )}
          {hoveredDate === dateStr && dayTodos.length > 0 && (
            <div className="calendar-tooltip">
              {dayTodos.slice(0, 5).map(todo => (
                <div key={todo.id} className="tooltip-item">
                  <span className={`tooltip-priority priority-${todo.priority}`}>●</span>
                  <span className="tooltip-text">{todo.text.length > 30 ? todo.text.substring(0, 30) + '...' : todo.text}</span>
                  {todo.completed && <span className="tooltip-checked">✓</span>}
                </div>
              ))}
              {dayTodos.length > 5 && (
                <div className="tooltip-more">+{dayTodos.length - 5} more</div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    return days;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterPriority('all');
    setFilterDueDate('all');
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisible = 3;
    
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 2) {
        for (let i = 1; i <= 3; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 1) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 2; i <= totalPages; i++) pageNumbers.push(i);
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        pageNumbers.push(currentPage - 1);
        pageNumbers.push(currentPage);
        pageNumbers.push(currentPage + 1);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers;
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #141428 100%)'
      }}>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'auto' }}>
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0
        }}
      >
        <source src="/images/video_background.mp4" type="video/mp4" />
      </video>
      
      {/* Dark overlay */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        zIndex: 1
      }}></div>
      
      {/* Fixed Navbar - Original Size */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 3,
        padding: '20px'
      }}>
        <div className="navbar" style={{ 
          borderRadius: '16px',
          background: 'rgba(20, 20, 40, 0.95)',
          margin: 0,
          padding: '1rem 2rem'
        }}>
          <div className="logo">TaskFlow Pro</div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{ 
                  width: 'auto', 
                  padding: '8px 20px', 
                  margin: 0, 
                  background: 'rgba(0, 212, 255, 0.15)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.9rem'
                }}
              >
                <span>👤</span>
                <span>{user}</span>
                <span>▼</span>
              </button>
              
              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'rgba(20, 20, 40, 0.98)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '12px',
                  minWidth: '200px',
                  zIndex: 1000,
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      getUserProfile();
                      setShowProfileModal(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      margin: 0,
                      textAlign: 'left',
                      background: 'transparent',
                      borderRadius: 0,
                      borderBottom: '1px solid rgba(0, 212, 255, 0.1)'
                    }}
                  >
                    👤 View Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowChangePasswordModal(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      margin: 0,
                      textAlign: 'left',
                      background: 'transparent',
                      borderRadius: 0,
                      borderBottom: '1px solid rgba(0, 212, 255, 0.1)'
                    }}
                  >
                    🔒 Change Password
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      margin: 0,
                      textAlign: 'left',
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: 0,
                      color: '#ef4444'
                    }}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div style={{ 
        position: 'relative', 
        zIndex: 2, 
        paddingTop: '100px',
        paddingBottom: '20px',
        paddingLeft: '20px',
        paddingRight: '20px'
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '1200px', 
          margin: '0 auto'
        }}>
          <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(20, 20, 40, 0.9)' }}>
            <div className="dashboard-content">
              <div className="status-badge">✓ Authenticated</div>
              <h1>Welcome, {user}!</h1>
              
              <div className="view-toggle" style={{ gap: '6px' }}>
                <button className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>📋 List</button>
                <button className={`view-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`} onClick={() => setViewMode('calendar')} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>📅 Calendar</button>
              </div>

              {viewMode === 'list' ? (
                <>
                  <div style={{ marginTop: '1rem' }}>
                    <input className="add-task-input" type="text" value={newTodo} onChange={(e) => setNewTodo(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addTodo()} placeholder="What needs to be done?" style={{ marginBottom: '1rem' }} />
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
  <DatePicker 
    selected={newDueDate} 
    onChange={(date: Date | null) => setNewDueDate(date)} 
    dateFormat="yyyy-MM-dd" 
    placeholderText="Select date" 
  />
  <input 
    type="time" 
    value={newDueTime} 
    onChange={(e) => setNewDueTime(e.target.value)} 
    placeholder="Select time" 
    style={{ width: 'auto', padding: '8px 12px', fontSize: '0.85rem' }} 
  />
  <select 
    value={newPriority} 
    onChange={(e) => setNewPriority(e.target.value as Todo['priority'])} 
    style={{ width: 'auto', padding: '8px 12px', fontSize: '0.85rem' }}
  >
    <option value="" disabled selected>Select priority</option>
    <option value="low">Low</option>
    <option value="medium">Medium</option>
    <option value="high">High</option>
  </select>
  <button onClick={addTodo} style={{ width: 'auto', padding: '8px 20px', margin: 0, fontSize: '0.85rem' }}>+ Add</button>
</div>
                  </div>

                  {(searchTerm !== '' || filterPriority !== 'all' || filterDueDate !== 'all') && (
                    <div style={{ marginBottom: '1rem', textAlign: 'right' }}>
                      <button onClick={clearFilters} style={{ width: 'auto', padding: '4px 12px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.2)' }}>✕ Clear Filters</button>
                    </div>
                  )}

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(0, 212, 255, 0.05)' }}>
                          <th style={{ padding: '8px', textAlign: 'center', width: '35px' }}>✓</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>
                            Task
                            <div style={{ marginTop: '6px' }}>
                              <input type="text" placeholder="🔍 Filter..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} style={{ width: '100%', padding: '4px 8px', fontSize: '0.7rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px' }} />
                            </div>
                          </th>
                          <th style={{ padding: '8px', textAlign: 'left', width: '90px' }}>
                            Priority
                            <div style={{ marginTop: '6px' }}>
                              <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value as Todo['priority'] | 'all'); setCurrentPage(1); }} style={{ width: '100%', padding: '4px 8px', fontSize: '0.7rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', cursor: 'pointer' }}>
                                <option value="all">All</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                          </th>
                          <th style={{ padding: '8px', textAlign: 'left', width: '120px' }}>
                            Due Date
                            <div style={{ marginTop: '6px' }}>
                              <select value={filterDueDate} onChange={(e) => { setFilterDueDate(e.target.value); setCurrentPage(1); }} style={{ width: '100%', padding: '4px 8px', fontSize: '0.7rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', cursor: 'pointer' }}>
                                <option value="all">All</option>
                                <option value="overdue">Overdue</option>
                                <option value="today">Today</option>
                                <option value="tomorrow">Tomorrow</option>
                                <option value="week">Next 7d</option>
                              </select>
                            </div>
                          </th>
                          <th style={{ padding: '8px', textAlign: 'center', width: '100px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentTodos.length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No tasks found</td></tr>
                        ) : (
                          currentTodos.map(todo => {
                            const dueStatus = getDueStatus(todo.dueDate);
                            return (
                              <tr key={todo.id} style={{ borderBottom: '1px solid var(--border)', background: todo.completed ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                                {todo.isEditing ? (
                                  <>
                                    <td style={{ padding: '8px' }}></td>
                                    <td colSpan={4} style={{ padding: '8px' }}>
                                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} style={{ flex: 1, fontSize: '0.8rem' }} />
                                        <DatePicker selected={editDueDate} onChange={(date: Date | null) => setEditDueDate(date)} dateFormat="yyyy-MM-dd" placeholderText="Select date" />
                                        <input type="time" value={editDueTime} onChange={(e) => setEditDueTime(e.target.value)} placeholder="Select time" style={{ width: 'auto' }} />
                                        <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as Todo['priority'])} style={{ width: 'auto' }}>
                                          <option value="low">Low</option>
                                          <option value="medium">Medium</option>
                                          <option value="high">High</option>
                                        </select>
                                        <button onClick={() => saveEdit(todo.id)} style={{ padding: '4px 10px' }}>Save</button>
                                        <button onClick={() => cancelEdit(todo.id)} style={{ padding: '4px 10px' }}>Cancel</button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                      <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo.id)} style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
                                    </td>
                                    <td style={{ padding: '8px', textDecoration: todo.completed ? 'line-through' : 'none', textDecorationColor: todo.completed ? '#ef4444' : 'inherit', cursor: 'pointer', wordBreak: 'break-word' }} onDoubleClick={() => startEdit(todo)}>
                                      {todo.text}
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                      <span className={`priority-badge priority-${todo.priority}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                        {todo.priority === 'high' ? '🔴' : todo.priority === 'medium' ? '🟡' : '🟢'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                      {todo.dueDate && todo.dueDate !== '' ? (
                                        <span className={`due-badge due-${dueStatus}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                          📅 {todo.dueDate.slice(5)} {todo.dueTime}
                                        </span>
                                      ) : (
                                        <span className="due-badge" style={{ fontSize: '0.65rem', padding: '2px 6px', opacity: 0.5 }}>No date set</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                      <button onClick={() => startEdit(todo)} style={{ width: 'auto', padding: '2px 6px', margin: '0 2px', fontSize: '0.65rem' }}>Edit</button>
                                      <button onClick={() => deleteTodo(todo.id)} style={{ width: 'auto', padding: '2px 6px', margin: '0 2px', fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.2)' }}>Delete</button>
                                    </td>
                                  </>
                                )}
                               </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>

                    {totalPages > 1 && (
                      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '4px 12px', fontSize: '0.75rem', width: 'auto', margin: 0, background: 'rgba(255, 255, 255, 0.08)' }}>← Previous</button>
                        {getPageNumbers().map((page, idx) => (
                          page === '...' ? (
                            <span key={idx} style={{ padding: '3px 5px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>...</span>
                          ) : (
                            <button key={idx} onClick={() => setCurrentPage(page as number)} style={{ padding: '4px 10px', fontSize: '0.75rem', width: 'auto', margin: 0, minWidth: '32px', background: currentPage === page ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'rgba(255, 255, 255, 0.08)' }}>{page}</button>
                          )
                        ))}
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '4px 12px', fontSize: '0.75rem', width: 'auto', margin: 0, background: 'rgba(255, 255, 255, 0.08)' }}>Next →</button>
                      </div>
                    )}
                  </div>

                  {todos.length > 0 && (
                    <div style={{ marginTop: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.65rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                      ✅{todos.filter(t => t.completed).length} completed • 📋 {todos.length} total
                      {filteredTodos.length !== todos.length && ` • 🔍 Showing ${filteredTodos.length}`}
                    </div>
                  )}
                </>
              ) : (
                <div className="calendar-container">
                  <div className="calendar-header">
                    <button onClick={goToPrevMonth} className="calendar-nav-btn">←</button>
                    <div className="calendar-month-year">
                      <span>{new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long' })}</span>
                      <span>{calendarYear}</span>
                    </div>
                    <button onClick={goToNextMonth} className="calendar-nav-btn">→</button>
                    <button onClick={goToCurrentMonth} className="calendar-today-btn">Today</button>
                  </div>
                  <div className="calendar-grid">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="calendar-weekday">{day}</div>
                    ))}
                    {renderCalendar()}
                  </div>
                  <div className="calendar-legend">
                    <div className="legend-item"><div className="legend-dot has-tasks"></div><span>Has tasks</span></div>
                    <div className="legend-item"><div className="legend-dot today"></div><span>Today</span></div>
                    <div className="legend-item"><span>💡 Hover over date to see tasks</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }} onClick={() => setShowProfileModal(false)}>
          <div className="glass-card" style={{ maxWidth: '450px', margin: '20px' }} onClick={(e) => e.stopPropagation()}>
            <h3>My Profile</h3>
            <div style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>First Name</label>
                <input type="text" value={firstName} disabled style={{ opacity: 0.7 }} />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" value={lastName} disabled style={{ opacity: 0.7 }} />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input type="text" value={user} disabled style={{ opacity: 0.7 }} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={userEmail} disabled style={{ opacity: 0.7 }} />
              </div>
            </div>
            <button onClick={() => setShowProfileModal(false)} style={{ marginTop: '1rem' }}>Close</button>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }} onClick={() => setShowChangePasswordModal(false)}>
          <div className="glass-card" style={{ maxWidth: '400px', margin: '20px' }} onClick={(e) => e.stopPropagation()}>
            <h3>Change Password</h3>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Enter current password" />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={newPasswordChange} onChange={(e) => setNewPasswordChange(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={confirmNewPasswordChange} onChange={(e) => setConfirmNewPasswordChange(e.target.value)} placeholder="Confirm new password" />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
              <button onClick={handleChangePassword} disabled={resetLoading} style={{ flex: 1 }}>
                {resetLoading ? <span className="spinner"></span> : 'Update Password'}
              </button>
              <button onClick={() => setShowChangePasswordModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;