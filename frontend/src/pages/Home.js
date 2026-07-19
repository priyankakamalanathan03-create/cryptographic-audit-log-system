import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      const userData = JSON.parse(user);
      if (userData.role === 'ADMIN') {
        navigate('/admin-dashboard');
      } else {
        navigate('/user-dashboard');
      }
    }
  }, [navigate]);

  return (
    <div className="home-container">
      <div className="home-card">
        <h1>Immutable Audit Log System</h1>
        <p>
          A production-grade, secure MERN platform featuring cryptographic hash chaining, 
          real-time audit metrics, role-based visibility, admin user controls, and secure workspace monitoring.
        </p>
        <div className="home-buttons">
          <button onClick={() => navigate('/login')} className="primary-btn">
            Sign In
          </button>
          <button onClick={() => navigate('/register')} className="secondary-btn">
            Create Account
          </button>
        </div>
        <div className="features">
          <h3>Platform Highlights:</h3>
          <ul>
            <li>Cryptographic Hash Chaining</li>
            <li>Database Tamper Detection</li>
            <li>Role-Based Access (RBAC)</li>
            <li>Admin User Actions panel</li>
            <li>Secure User Notes CRUD</li>
            <li>Failed Authentication logs</li>
            <li>Real-time visual stats</li>
            <li>CSV / JSON logs exporting</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;
