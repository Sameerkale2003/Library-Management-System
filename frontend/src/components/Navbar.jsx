import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark navbar-custom shadow-sm sticky-top no-print">
      <div className="container-fluid px-md-4">
        <Link className="navbar-brand d-flex align-items-center gap-2 text-white" to="/">
          <div className="bg-primary text-white p-1 rounded-2 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
            <i className="bi bi-book-half"></i>
          </div>
          <span className="fw-bold tracking-tight">CentralLibrary<span className="text-primary">OS</span></span>
        </Link>

        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-3 gap-1">
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/') ? 'active text-white fw-semibold' : 'text-white-50'}`} to="/">
                <i className="bi bi-grid me-1"></i> Catalog
              </Link>
            </li>
            {isAuthenticated && isAdmin && (
              <li className="nav-item">
                <Link className={`nav-link ${isActive('/admin') ? 'active text-white fw-semibold' : 'text-white-50'}`} to="/admin">
                  <i className="bi bi-shield-check me-1 text-warning"></i> Librarian Console
                </Link>
              </li>
            )}
            {isAuthenticated && (
              <li className="nav-item">
                <Link className={`nav-link ${isActive('/my-loans') ? 'active text-white fw-semibold' : 'text-white-50'}`} to="/my-loans">
                  <i className="bi bi-journal-check me-1 text-info"></i> My Borrowed Books
                </Link>
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center gap-3">
            {isAuthenticated ? (
              <div className="d-flex align-items-center gap-3">
                <div className="text-end text-light small d-none d-md-block">
                  <div className="fw-bold text-white">{user.username}</div>
                  <div className="text-white-50" style={{ fontSize: '0.75rem' }}>{user.membershipId}</div>
                </div>
                <span className={`badge ${isAdmin ? 'bg-primary' : 'bg-success'} text-uppercase`}>
                  {isAdmin ? 'Librarian' : 'Student'}
                </span>
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={handleLogout}
                  title="Logout"
                >
                  <i className="bi bi-box-arrow-right me-1"></i> Logout
                </button>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <Link to="/login" className="btn btn-outline-light btn-sm">
                  <i className="bi bi-box-arrow-in-right me-1"></i> Sign In
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
