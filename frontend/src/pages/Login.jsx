import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError('');
    setLoading(true);
    try {
      const authUser = await login(user, pass);
      if (authUser.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('Demo credentials error. Please verify backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow border-0 rounded-4 bg-white p-4">
            <div className="text-center mb-4">
              <div className="bg-primary text-white d-inline-flex p-3 rounded-circle mb-2">
                <i className="bi bi-book-half fs-2"></i>
              </div>
              <h3 className="fw-bold">Sign In to LibraryOS</h3>
              <p className="text-muted small">Enter your credentials or click a demo account</p>
            </div>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-bold">Username</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold">Password</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>

              <button type="submit" className="btn btn-primary w-100 py-2 mb-3" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="border-top pt-3 mt-2 text-center">
              <span className="small text-muted d-block mb-2">Quick Test Accounts:</span>
              <div className="d-grid gap-2">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => handleDemoLogin('admin', 'Admin@1234')}
                >
                  <i className="bi bi-shield-check me-1"></i> Login as Librarian (admin)
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => handleDemoLogin('student', 'Student@1234')}
                >
                  <i className="bi bi-person me-1"></i> Login as Student (student)
                </button>
              </div>
            </div>

            <div className="text-center mt-4">
              <span className="text-muted small">New member? </span>
              <Link to="/register" className="small text-primary text-decoration-none fw-semibold">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
