import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, auditLogAPI, usersAPI, notesAPI } from '../services/api';
import './Dashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'users', 'integrity', 'logs', 'notes'
  const [user, setUser] = useState(null);
  
  // States
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Verification states
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  // Selected log for certificate modal
  const [selectedLog, setSelectedLog] = useState(null);

  // Filters and Paging
  const [filter, setFilter] = useState({ search: '', action: '', startDate: '', endDate: '' });
  const [pendingFilter, setPendingFilter] = useState({ search: '', action: '', startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Note Modal state (Admins can also CRUD own notes)
  const [noteModal, setNoteModal] = useState({ open: false, mode: 'create', noteId: null });
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });

  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter, activeTab]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const userResponse = await authAPI.getCurrentUser();
      setUser(userResponse.data);

      if (activeTab === 'dashboard') {
        const statsResponse = await auditLogAPI.getStats();
        setStats(statsResponse.data);
        // Fetch last few logs for dashboard overview
        const logsResponse = await auditLogAPI.getAllLogs({ page: 1, limit: 5 });
        setLogs(logsResponse.data.logs);
      }

      if (activeTab === 'logs') {
        const params = { page, limit: 10, ...filter };
        const logsResponse = await auditLogAPI.getAllLogs(params);
        setLogs(logsResponse.data.logs);
        setTotal(logsResponse.data.total);
      }

      if (activeTab === 'users') {
        const usersResponse = await usersAPI.getAll();
        setUsersList(usersResponse.data);
      }

      if (activeTab === 'notes') {
        const notesResponse = await notesAPI.getAll();
        setNotes(notesResponse.data);
      }
    } catch (err) {
      setError('Failed to load admin panel data');
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
    const empty = { search: '', action: '', startDate: '', endDate: '' };
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

  // User Administration Handlers
  const handleToggleStatus = async (userId) => {
    try {
      setError('');
      const response = await usersAPI.updateStatus(userId);
      // Refresh user list
      const usersResponse = await usersAPI.getAll();
      setUsersList(usersResponse.data);
      alert(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      setError('');
      const response = await usersAPI.updateRole(userId, newRole);
      // Refresh user list
      const usersResponse = await usersAPI.getAll();
      setUsersList(usersResponse.data);
      alert(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user role');
    }
  };

  // Cryptographic Verification Handler
  const runIntegrityCheck = async () => {
    try {
      setVerifyLoading(true);
      setVerifyResult(null);
      setError('');
      // Add fake visual delay to make integrity check experience feel extremely premium
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const response = await auditLogAPI.verifyLogs();
      setVerifyResult(response.data);
    } catch (err) {
      setError('Integrity check failed to complete');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Notes CRUD Handlers (For admin workspace notes)
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
      fetchAdminData();
    } catch (err) {
      setError('Failed to save secure note');
    }
  };

  const handleNoteDelete = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this secure note?')) return;
    try {
      await notesAPI.delete(noteId);
      fetchAdminData();
    } catch (err) {
      setError('Failed to delete secure note');
    }
  };

  // Logs Export functions
  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ['Username', 'Action', 'Description', 'Timestamp', 'IP Address', 'User Agent'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.username,
        log.action,
        `"${log.description.replace(/"/g, '""')}"`,
        new Date(log.timestamp).toISOString(),
        log.ipAddress || 'N/A',
        `"${(log.userAgent || 'N/A').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `system_audit_logs_${Date.now()}.csv`);
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
    link.setAttribute('download', `system_audit_logs_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate percentage helper for stats charts
  const getStatPercentage = (count) => {
    if (!stats || stats.totalLogs === 0) return 0;
    return Math.round((count / stats.totalLogs) * 100);
  };

  if (loading && !user) return <div className="loading">Loading Admin Console...</div>;

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>✦ AuditLog Admin</h2>
        </div>

        <div className="sidebar-user">
          <span className="username">{user?.username}</span>
          <span className="role-badge admin">{user?.role}</span>
        </div>

        <nav className="sidebar-menu">
          <li className="sidebar-item">
            <button 
              className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); }}
            >
              Dashboard Overview
            </button>
          </li>
          <li className="sidebar-item">
            <button 
              className={`sidebar-link ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => { setActiveTab('users'); }}
            >
              User Management
            </button>
          </li>
          <li className="sidebar-item">
            <button 
              className={`sidebar-link ${activeTab === 'integrity' ? 'active' : ''}`}
              onClick={() => { setActiveTab('integrity'); setVerifyResult(null); }}
            >
              Verify Log Integrity
            </button>
          </li>
          <li className="sidebar-item">
            <button 
              className={`sidebar-link ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => { setActiveTab('logs'); setPage(1); }}
            >
              All System Logs
            </button>
          </li>
          <li className="sidebar-item">
            <button 
              className={`sidebar-link ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => { setActiveTab('notes'); }}
            >
              Admin Private Notes
            </button>
          </li>
        </nav>

        <div className="sidebar-logout">
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="main-header">
          <h1>
            {activeTab === 'dashboard' && 'Compliance & Analytics'}
            {activeTab === 'users' && 'System Users Registry'}
            {activeTab === 'integrity' && 'Database Tamper Audit'}
            {activeTab === 'logs' && 'Global System Activity Log'}
            {activeTab === 'notes' && 'Admin Notes Workspace'}
          </h1>
          <div className="system-status">
            <div className="status-dot"></div>
            <span>Connected - Cryptographic Shield Active</span>
          </div>
        </header>

        {error && <div className="error-message">{error}</div>}

        {/* TAB 1: DASHBOARD & CHARTS */}
        {activeTab === 'dashboard' && (
          <div className="integrity-container">
            {stats && (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Total System Logs</h3>
                    <p style={{ color: '#818cf8' }}>{stats.totalLogs}</p>
                  </div>
                  {stats.actionStats.map((stat) => (
                    <div className="stat-card" data-action={stat._id} key={stat._id}>
                      <h3>{stat._id} Events</h3>
                      <p>{stat.count}</p>
                    </div>
                  ))}
                </div>

                <div className="dashboard-grid">
                  <div className="chart-card">
                    <h2>Events Distribution</h2>
                    <div className="chart-bar-container">
                      {stats.actionStats.map((stat) => {
                        const pct = getStatPercentage(stat.count);
                        return (
                          <div className="chart-row" key={stat._id}>
                            <div className="chart-label">{stat._id}</div>
                            <div className="chart-track">
                              <div className={`chart-fill ${stat._id}`} style={{ width: `${pct}%` }}></div>
                            </div>
                            <div className="chart-val">{pct}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="card">
                    <h2>Audit Log Cryptography Overview</h2>
                    <p style={{ color: '#9ca3af', lineHeight: '1.6', fontSize: '14.5px', marginBottom: '15px' }}>
                      Logs in this system are protected by **SHA-256 Hash Chaining** (similar to block generation in blockchains).
                      Each log entry holds a hash derived from its content concatenated with the hash of the preceding entry.
                    </p>
                    <p style={{ color: '#9ca3af', lineHeight: '1.6', fontSize: '14.5px' }}>
                      Should any user (or database administrator) modify log records directly in the database, the cryptographic hash link
                      will break. Admins can run the verification report to identify exactly where a breech happened.
                    </p>
                    <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => setActiveTab('integrity')}>Run Integrity Verification</button>
                  </div>
                </div>
              </>
            )}

            <div className="card" style={{ marginTop: '10px' }}>
              <h2>Recent System Activities</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
                {logs.slice(0, 5).map((log) => (
                  <div key={log._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <span className={`badge ${log.action}`} style={{ marginRight: '12px' }}>{log.action}</span>
                      <strong style={{ fontSize: '14px', color: '#f3f4f6', marginRight: '10px' }}>{log.username}</strong>
                      <span style={{ fontSize: '14px', color: '#9ca3af' }}>{log.description}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Email Address</th>
                  <th>Role Placement</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length > 0 ? (
                  usersList.map((usr) => (
                    <tr key={usr._id}>
                      <td>
                        <div className="user-row-avatar">
                          {usr.username.substring(0, 2).toUpperCase()}
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: 'white' }}>{usr.username}</strong>
                      </td>
                      <td>{usr.email}</td>
                      <td>
                        {usr._id === user?.id ? (
                          <span className={`role-badge ${usr.role.toLowerCase()}`}>{usr.role}</span>
                        ) : (
                          <select
                            className="role-select"
                            value={usr.role}
                            onChange={(e) => handleRoleChange(usr._id, e.target.value)}
                          >
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        )}
                      </td>
                      <td>
                        <div className="status-indicator">
                          <div className={`status-dot-mini ${usr.isActive ? 'active' : 'inactive'}`}></div>
                          <span>{usr.isActive ? 'Active' : 'Suspended'}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {usr._id !== user?.id && (
                          <button
                            className={`user-action-btn toggle-active ${usr.isActive ? '' : 'reactivate'}`}
                            onClick={() => handleToggleStatus(usr._id)}
                          >
                            {usr.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: '#9ca3af' }}>No registered users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: INTEGRITY VERIFICATION */}
        {activeTab === 'integrity' && (
          <div className="integrity-container">
            <div className="verify-button-card">
              <div className="verify-text">
                <h3>Cryptographic Audit Chain Scan</h3>
                <p>
                  Run a full database audit scan. The system will recursively trace the hash chaining 
                  of all system logs, verifying the previous node links and recomputing the SHA-256 signature blocks.
                </p>
              </div>
              <button 
                className="btn-primary" 
                style={{ padding: '14px 28px' }} 
                disabled={verifyLoading}
                onClick={runIntegrityCheck}
              >
                {verifyLoading ? 'Scanning Database...' : 'Run Integrity Scan'}
              </button>
            </div>

            {verifyLoading && (
              <div className="verify-results-card verify-running">
                <div className="spinner"></div>
                <p style={{ color: '#9ca3af', fontWeight: '500' }}>Re-indexing cryptographic blocks, verifying link checksums...</p>
              </div>
            )}

            {verifyResult && (
              <div className="verify-results-card">
                <div className="result-status">
                  <div className={`result-icon ${verifyResult.verified ? 'success' : 'failed'}`}>
                    {verifyResult.verified ? '✓' : '⚠️'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', color: verifyResult.verified ? '#10b981' : '#ef4444' }}>
                      {verifyResult.verified ? 'INTEGRITY SECURE' : 'COMPROMISED DETECTED'}
                    </h3>
                    <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
                      {verifyResult.message}
                    </p>
                  </div>
                </div>

                <div className="result-details">
                  <p><strong>Total Logs Inspected:</strong> {verifyResult.totalLogsVerified || 0}</p>
                  
                  {!verifyResult.verified && verifyResult.tamperedLog && (
                    <>
                      <p style={{ color: '#f87171' }}><strong>Error Details:</strong> {verifyResult.details}</p>
                      <p><strong>Compromised Record Block details:</strong></p>
                      <div className="result-code-box">
                        {JSON.stringify(verifyResult.tamperedLog, null, 2)}
                      </div>
                    </>
                  )}

                  {verifyResult.verified && (
                    <p style={{ color: '#34d399', fontSize: '14px' }}>
                      ✦ Database logs matching expected checksum chains. Cryptographic link blocks are intact. No tampering detected.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ALL LOGS LIST */}
        {activeTab === 'logs' && (
          <div>
            <div className="filter-section">
              <h2>Global Security Search Filter</h2>
              <div className="filters-wrapper">
                <div className="filters">
                  <input
                    type="text"
                    name="search"
                    placeholder="Search by Username/Email"
                    value={pendingFilter.search}
                    onChange={handleFilterChange}
                  />

                  <select name="action" value={pendingFilter.action} onChange={handleFilterChange}>
                    <option value="">All Actions</option>
                    <option value="LOGIN">Login</option>
                    <option value="LOGOUT">Logout</option>
                    <option value="CREATE">Create Note</option>
                    <option value="UPDATE">Update Actions</option>
                    <option value="DELETE">Delete Note</option>
                    <option value="FAILED_LOGIN">Failed Logins</option>
                  </select>

                  <input
                    type="date"
                    name="startDate"
                    value={pendingFilter.startDate}
                    onChange={handleFilterChange}
                  />

                  <input
                    type="date"
                    name="endDate"
                    value={pendingFilter.endDate}
                    onChange={handleFilterChange}
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
              <div className="loading">Retrieving all security events...</div>
            ) : (
              <>
                <div className="table-container">
                  <table className="logs-table">
                    <thead>
                      <tr>
                        <th>Operator</th>
                        <th>Action</th>
                        <th>Event Description</th>
                        <th>Timestamp</th>
                        <th>IP Address</th>
                        <th>User Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length > 0 ? (
                        logs.map((log) => (
                          <tr key={log._id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLog(log)} title="Click to view cryptographic certificate">
                            <td>
                              <strong style={{ color: 'white' }}>{log.username}</strong>
                            </td>
                            <td>
                              <span className={`badge ${log.action}`}>{log.action}</span>
                            </td>
                            <td>{log.description}</td>
                            <td>{new Date(log.timestamp).toLocaleString()}</td>
                            <td>{log.ipAddress || 'N/A'}</td>
                            <td className="user-agent-col" title={log.userAgent}>
                              {log.userAgent || 'N/A'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: '#9ca3af' }}>No audit records found matching parameters.</td>
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

        {/* TAB 5: ADMIN NOTES WORKSPACE */}
        {activeTab === 'notes' && (
          <div className="integrity-container">
            <div className="notes-header">
              <h2>My Private Admin Workspace Notes</h2>
              <button onClick={openNoteCreate} className="btn-primary">+ Add Admin Note</button>
            </div>

            {loading ? (
              <div className="loading">Fetching workspace notes...</div>
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
                <p style={{ color: '#9ca3af', marginBottom: '20px' }}>Admin workspace empty. Write a note to log a test CREATE audit trail event.</p>
                <button onClick={openNoteCreate} className="btn-primary">Create Workspace Note</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Note modal (create/edit) */}
      {noteModal.open && (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleNoteSubmit}>
            <h2>{noteModal.mode === 'create' ? 'Create Workspace Note' : 'Update Workspace Note'}</h2>
            
            <div className="form-group">
              <label>Note Title:</label>
              <input
                type="text"
                value={noteForm.title}
                onChange={(e) => setNoteForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Audit Log Retention Policy"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Secure Content:</label>
              <textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your private note details here..."
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
                <span style={{ fontFamily: 'monospace', color: '#e5e7eb', fontSize: '13px' }}>{selectedLog._id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: '#9ca3af', fontWeight: '600' }}>Event Action:</span>
                <span className={`badge ${selectedLog.action}`}>{selectedLog.action}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: '#9ca3af', fontWeight: '600' }}>Operator:</span>
                <span style={{ color: '#e5e7eb', fontWeight: '700' }}>{selectedLog.username}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: '#9ca3af', fontWeight: '600' }}>Description:</span>
                <span style={{ color: '#e5e7eb', textAlign: 'right', maxWidth: '70%' }}>{selectedLog.description}</span>
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
                <span style={{ color: '#9ca3af', fontWeight: '600' }}>User Agent:</span>
                <span style={{ color: '#d1d5db', fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '5px' }}>{selectedLog.userAgent || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af', fontWeight: '700' }}>SHA-256 Current Hash:</span>
                  <button type="button" className="link-button" onClick={() => { navigator.clipboard.writeText(selectedLog.hash || ''); alert('Hash copied!'); }} style={{ fontSize: '12px' }}>Copy</button>
                </div>
                <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.25)', borderRadius: '6px', padding: '10px', fontSize: '12px', fontFamily: 'monospace', color: '#818cf8', wordBreak: 'break-all' }}>
                  {selectedLog.hash || 'N/A'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af', fontWeight: '700' }}>Previous Hash Link:</span>
                  <button type="button" className="link-button" onClick={() => { navigator.clipboard.writeText(selectedLog.previousHash || ''); alert('Previous hash copied!'); }} style={{ fontSize: '12px' }}>Copy</button>
                </div>
                <div style={{ background: 'rgba(168,85,247,0.06)', border: '1px dashed rgba(168,85,247,0.25)', borderRadius: '6px', padding: '10px', fontSize: '12px', fontFamily: 'monospace', color: '#c084fc', wordBreak: 'break-all' }}>
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

export default AdminDashboard;

