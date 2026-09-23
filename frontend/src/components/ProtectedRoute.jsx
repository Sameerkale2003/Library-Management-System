import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-warning d-inline-block shadow-sm">
          <i className="bi bi-shield-lock me-2"></i>
          Access Denied: You do not have permission to view this section ({requiredRole} required).
        </div>
      </div>
    );
  }

  return children;
}
