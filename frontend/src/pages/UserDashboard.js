import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, auditLogAPI, notesAPI } from '../services/api';
import './Dashboard.css';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'notes', 'logs'
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ action: '', startDate: '', endDate: '' });
  const [pendingFilter, setPendingFilter] = useState({ action: '', startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Note Modal state
  const [noteModal, setNoteModal] = useState({ open: false, mode: 'create', noteId: null });
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [selectedLog, setSelectedLog] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchUserAndLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter, activeTab]);

  const fetchUserAndLogs = async () => {
    try {
      setLoading(true);
      const userResponse = await authAPI.getCurrentUser();
      setUser(userResponse.data);

      if (activeTab === 'logs' || activeTab === 'dashboard') {
        const params = { page, limit: 10, ...filter };
        const logsResponse = await auditLogAPI.getMyLogs(params);
        setLogs(logsResponse.data.logs);
        setTotal(logsResponse.data.total);
      }

      if (activeTab === 'notes') {
        const notesResponse = await notesAPI.getAll();
        setNotes(notesResponse.data);
      }
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setPendingFilter((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setFilter(pendingFilter);
    setPage(1);
  };

  const clearFilters = () => {
    const empty = { action: '', startDate: '', endDate: '' };
    setPendingFilter(empty);
    setFilter(empty);
    setPage(1);
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Secure Notes Handlers
  const openNoteCreate = () => {
    setNoteForm({ title: '', content: '' });
    setNoteModal({ open: true, mode: 'create', noteId: null });
  };

  const openNoteEdit = (note) => {
    setNoteForm({ title: note.title, content: note.content });
    setNoteModal({ open: true, mode: 'edit', noteId: note._id });
  };

  const closeNoteModal = () => {
    setNoteModal({ open: false, mode: 'create', noteId: null });
    setNoteForm({ title: '', content: '' });
  };

  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    try {
      if (noteModal.mode === 'create') {
        await notesAPI.create(noteForm.title, noteForm.content);
      } else {
        await notesAPI.update(noteModal.noteId, noteForm.title, noteForm.content);
      }
      closeNoteModal();
      fetchUserAndLogs();
    } catch (err) {
      setError('Failed to save secure note');
    }
  };

  const handleNoteDelete = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this secure note?')) return;
    try {
      await notesAPI.delete(noteId);
      fetchUserAndLogs();
    } catch (err) {
      setError('Failed to delete secure note');
    }
  };

  // Logs Export functions
  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ['Action', 'Description', 'Timestamp', 'IP Address'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.action,
        `"${log.description.replace(/"/g, '""')}"`,
        new Date(log.timestamp).toISOString(),
        log.ipAddress || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `my_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!logs.length) return;
    const jsonString = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `my_audit_logs_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !user) return <div className="loading">Loading User Workspace...</div>;

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>✦ AuditLog Platform</h2>
        </div>
        
        <div className="sidebar-user">
          <span className="username">{user?.username}</span>
          <span className="role-badge user">{user?.role}</span>
        </div>

        <nav className="sidebar-menu">
          <li className="sidebar-item">
            <button 
              className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); setPage(1); }}
            >
              Dashboard
            </button>
          </li>
          <li className="sidebar-item">
            <button 
              className={`sidebar-link ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => { setActiveTab('notes'); }}
            >
              Secure Notes CRUD
            </button>
          </li>
          <li className="sidebar-item">
            <button 
              className={`sidebar-link ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => { setActiveTab('logs'); setPage(1); }}
            >
              Activity Logs
            </button>
          </li>
        </nav>

        <div className="sidebar-logout">
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        <header className="main-header">
          <h1>
            {activeTab === 'dashboard' && 'Workspace Dashboard'}
            {activeTab === 'notes' && 'Secure Notes Manager'}
            {activeTab === 'logs' && 'My Security Activity Audit'}
          </h1>
          <div className="system-status">
            <div className="status-dot"></div>
            <span>Connected - Hash Chained Integrity</span>
          </div>
        </header>

        {error && <div className="error-message">{error}</div>}

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div className="card">
              <h2>Secure Workspace Overview</h2>
              <p style={{ color: '#d1d5db', lineHeight: '1.6', fontSize: '15px' }}>
                Welcome to your secure work portal. Any changes made to your data (such as creating, 
                updating, or deleting notes) will automatically generate a cryptographically secured audit 
                trail which is stored immutably.
              </p>
              <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                <button className="btn-primary" onClick={() => setActiveTab('notes')}>Manage Secure Notes</button>
                <button className="btn-secondary" onClick={() => setActiveTab('logs')}>Audit Logs</button>
              </div>
            </div>

            <div className="card">
              <h2>Recent Actions Summary</h2>
              {logs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  {logs.slice(0, 5).map((log) => (
                    <div key={log._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <span className={`badge ${log.action}`} style={{ marginRight: '12px' }}>{log.action}</span>
                        <span style={{ fontSize: '14px', color: '#e5e7eb' }}>{log.description}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>No recent activity logged.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SECURE NOTES */}
        {activeTab === 'notes' && (
          <div className="integrity-container">
            <div className="notes-header">
              <h2>My Cryptographic Encrypted Work Notes</h2>
              <button onClick={openNoteCreate} className="btn-primary">+ Create Secure Note</button>
            </div>

            {loading ? (
              <div className="loading">Fetching secure notes...</div>
            ) : notes.length > 0 ? (
              <div className="notes-grid">
                {notes.map((note) => (
                  <div className="note-card" key={note._id}>
                    <div>
                      <div className="note-title">{note.title}</div>
                      <div className="note-content">{note.content}</div>
                    </div>
                    <div className="note-footer">
                      <span>Updated: {new Date(note.updatedAt).toLocaleDateString()}</span>
                      <div className="note-actions">
                        <button className="note-action-btn edit" onClick={() => openNoteEdit(note)} title="Edit Note">✏️</button>
                        <button className="note-action-btn delete" onClick={() => handleNoteDelete(note._id)} title="Delete Note">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <p style={{ color: '#9ca3af', marginBottom: '20px' }}>No secure notes. Create one to automatically generate audit logs!</p>
                <button onClick={openNoteCreate} className="btn-primary">Create Your First Note</button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LOGS */}
        {activeTab === 'logs' && (
          <div>
            <div className="filter-section">
              <h2>Filter My Audit Log History</h2>
              <div className="filters-wrapper">
                <div className="filters">
                  <select name="action" value={pendingFilter.action} onChange={handleFilterChange}>
                    <option value="">All Actions</option>
                    <option value="LOGIN">Login</option>
                    <option value="LOGOUT">Logout</option>
                    <option value="CREATE">Create Note</option>
                    <option value="UPDATE">Update Actions</option>
                    <option value="DELETE">Delete Note</option>
                  </select>
                  <input
                    type="date"
                    name="startDate"
                    value={pendingFilter.startDate}
                    onChange={handleFilterChange}
                    placeholder="Start Date"
                  />
                  <input
                    type="date"
                    name="endDate"
                    value={pendingFilter.endDate}
                    onChange={handleFilterChange}
                    placeholder="End Date"
                  />
                  <button className="action-btn export" onClick={applyFilters} style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', border: 'none' }}>Apply Filters</button>
                  <button className="action-btn export" onClick={clearFilters}>Clear</button>
                </div>
                <div className="filter-actions">
                  <button className="action-btn export" onClick={handleExportCSV}>Export CSV</button>
                  <button className="action-btn export" onClick={handleExportJSON}>Export JSON</button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="loading">Retrieving audited records...</div>
            ) : (
              <>
                <div className="table-container">
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Logged Event Description</th>
                        <th>Timestamp</th>
                        <th>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length > 0 ? (
                        logs.map((log) => (
                          <tr key={log._id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLog(log)} title="Click to view cryptographic certificate">
                            <td>
                              <span className={`badge ${log.action}`}>{log.action}</span>
                            </td>
                            <td>{log.description}</td>
                            <td>{new Date(log.timestamp).toLocaleString()}</td>
                            <td>{log.ipAddress || 'N/A'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: '#9ca3af' }}>No logs found matching selection.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pagination">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {Math.max(1, Math.ceil(total / 10))}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= Math.ceil(total / 10)}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Note modal (create/edit) */}
      {noteModal.open && (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleNoteSubmit}>
            <h2>{noteModal.mode === 'create' ? 'Create Secure Note' : 'Update Secure Note'}</h2>
            
            <div className="form-group">
              <label>Note Title:</label>
              <input
                type="text"
                value={noteForm.title}
                onChange={(e) => setNoteForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Server Access Keys"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Secure Content:</label>
              <textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your secure note content here..."
                rows="6"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                required
              ></textarea>
            </div>

            <div className="modal-buttons">
              <button type="button" className="btn-secondary" onClick={closeNoteModal}>Cancel</button>
              <button type="submit" className="btn-primary">
                {noteModal.mode === 'create' ? 'Create Note' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Log Details Certificate Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <h2>Audit Log Certificate</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: '#9ca3af', fontWeight: '600' }}>Log ID:</span>
                <span style={{ fontFamily: 'monospace', color: '#e5e7eb' }}>{selectedLog._id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: '#9ca3af', fontWeight: '600' }}>Event Action:</span>
                <span className={`badge ${selectedLog.action}`}>{selectedLog.action}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: '#9ca3af', fontWeight: '600' }}>Operator:</span>
                <span style={{ color: '#e5e7eb', fontWeight: '600' }}>{selectedLog.username}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: '#9ca3af', fontWeight: '600' }}>Description:</span>
                <span style={{ color: '#e5e7eb', textAlign: 'right' }}>{selectedLog.description}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: '#9ca3af', fontWeight: '600' }}>Timestamp:</span>
                <span style={{ color: '#e5e7eb' }}>{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: '#9ca3af', fontWeight: '600' }}>Network IP:</span>
                <span style={{ color: '#e5e7eb' }}>{selectedLog.ipAddress || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: '#9ca3af', fontWeight: '600' }}>User Agent String:</span>
                <span style={{ color: '#d1d5db', fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '5px' }}>{selectedLog.userAgent || 'N/A'}</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af', fontWeight: '700' }}>Cryptographic SHA-256 Hash:</span>
                  <button type="button" className="link-button" onClick={() => { navigator.clipboard.writeText(selectedLog.hash); alert('Hash copied to clipboard!'); }} style={{ fontSize: '13px' }}>Copy Hash</button>
                </div>
                <div className="result-code-box" style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px dashed rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '10px', fontSize: '12px' }}>
                  {selectedLog.hash || 'N/A'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af', fontWeight: '700' }}>Previous Hash Link (Parent Checksum):</span>
                  <button type="button" className="link-button" onClick={() => { navigator.clipboard.writeText(selectedLog.previousHash); alert('Previous hash copied to clipboard!'); }} style={{ fontSize: '13px' }}>Copy Previous Hash</button>
                </div>
                <div className="result-code-box" style={{ background: 'rgba(168, 85, 247, 0.05)', border: '1px dashed rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '10px', fontSize: '12px' }}>
                  {selectedLog.previousHash || '0'}
                </div>
              </div>
            </div>

            <div className="modal-buttons" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-secondary" onClick={() => setSelectedLog(null)}>Close Certificate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
