import React from 'react';
import { Navigate } from 'react-router-dom';

// Decode JWT payload without verifying signature (server verifies on every API call).
// This ensures we always use the live role from the token, not a stale localStorage value.
function decodeJwtPayload(token) {
  try {
    const base64Payload = token.split('.')[1];
    const decoded = JSON.parse(atob(base64Payload));
    return decoded;
  } catch {
    return null;
  }
}

const ProtectedRoute = ({ component: Component, allowedRoles }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" />;
  }

  // Decode from the JWT itself so we always have the fresh role,
  // even if the admin changed the user's role since last login.
  const decoded = decodeJwtPayload(token);

  // If token is structurally invalid, force re-login
  if (!decoded) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" />;
  }

  // Check token expiry client-side (exp is in seconds)
  if (decoded.exp && decoded.exp * 1000 < Date.now()) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" />;
  }

  const role = decoded.role;

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to the correct dashboard for their actual role
    return <Navigate to={role === 'ADMIN' ? '/admin-dashboard' : '/user-dashboard'} />;
  }

  return <Component />;
};

export default ProtectedRoute;

