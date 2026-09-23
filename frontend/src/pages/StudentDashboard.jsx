import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import BorrowSlipModal from '../components/BorrowSlipModal';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlipLoanId, setSelectedSlipLoanId] = useState(null);

  // Phone Update Modal
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [loansRes, profileRes] = await Promise.all([
        api.get('/borrow-records/?ordering=-borrow_date'),
        api.get('/auth/profile/'),
      ]);
      setLoans(loansRes.data.results || loansRes.data);
      setProfile(profileRes.data);
      setPhoneInput(profileRes.data?.phone_number || '');
    } catch (err) {
      showToast('danger', 'Failed to load member borrowing record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdatePhone = async (e) => {
    e.preventDefault();
    setSavingPhone(true);
    try {
      const res = await api.patch('/auth/profile/', { phone_number: phoneInput });
      setProfile(res.data);
      showToast('success', 'Phone number updated successfully! You can now receive library alerts.');
      setShowPhoneModal(false);
    } catch (err) {
      showToast('danger', 'Failed to update phone number.');
    } finally {
      setSavingPhone(false);
    }
  };

  const activeLoans = loans.filter((l) => l.status === 'ISSUED');
  const pastLoans = loans.filter((l) => l.status === 'RETURNED');
  const totalUnpaidFines = loans
    .filter((l) => !l.fine_paid)
    .reduce((acc, curr) => acc + parseFloat(curr.effective_fine || curr.fine_amount || 0), 0);

  return (
    <div className="container py-4">
      {/* Toast */}
      {toast.show && (
        <div
          className={`alert alert-${toast.type} alert-dismissible fade show position-fixed top-0 end-0 m-3 shadow`}
          style={{ zIndex: 1090 }}
        >
          {toast.message}
          <button type="button" className="btn-close" onClick={() => setToast({ show: false, type: '', message: '' })}></button>
        </div>
      )}

      {/* Proof Slip Modal */}
      {selectedSlipLoanId && (
        <BorrowSlipModal loanId={selectedSlipLoanId} onClose={() => setSelectedSlipLoanId(null)} />
      )}

      {/* Update Phone Modal */}
      {showPhoneModal && (
        <div className="modal show fade d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">Update Mobile Phone Number</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPhoneModal(false)}></button>
              </div>
              <form onSubmit={handleUpdatePhone}>
                <div className="modal-body p-4">
                  <p className="text-muted small mb-3">
                    Your phone number is used by the library to send you due date reminders and return alerts on WhatsApp and SMS.
                  </p>
                  <label className="form-label small fw-bold">Contact Phone Number *</label>
                  <input
                    type="tel"
                    className="form-control"
                    required
                    placeholder="e.g. +1 555-019-2834"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                  />
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowPhoneModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={savingPhone}>
                    {savingPhone ? 'Saving...' : 'Save Phone Number'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="card shadow-sm border-0 mb-4 bg-dark text-white p-4 rounded-4">
        <div className="row align-items-center">
          <div className="col-md-8">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge bg-primary text-uppercase">Student / Member Portal</span>
              <span className="badge bg-secondary">{profile?.membership_id || user?.membershipId}</span>
            </div>
            <h3 className="fw-bold mb-1">
              Welcome back, {profile?.first_name ? `${profile.first_name} ${profile.last_name}` : user?.username}!
            </h3>
            <p className="mb-0 text-white-50 small">
              Email: <strong className="text-white">{profile?.email || user?.email}</strong> &bull; Phone:{' '}
              <strong className="text-white">{profile?.phone_number || 'Not added'}</strong>{' '}
              <button
                className="btn btn-link btn-sm text-info p-0 ms-1 text-decoration-none"
                onClick={() => setShowPhoneModal(true)}
              >
                <i className="bi bi-pencil-square"></i> Edit Phone
              </button>
            </p>
          </div>
          <div className="col-md-4 text-md-end mt-3 mt-md-0">
            <div className="bg-white bg-opacity-10 p-3 rounded-3 d-inline-block text-start border border-white border-opacity-10">
              <span className="small text-white-50 d-block">Unpaid Overdue Fines</span>
              <h4 className="fw-bold mb-0 text-warning">${totalUnpaidFines.toFixed(2)}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Currently Borrowed Books Section */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0 text-dark">
          <i className="bi bi-book-half text-primary me-2"></i>
          Currently Borrowed Books ({activeLoans.length})
        </h4>
        <small className="text-muted">Present your official proof slip at the circulation desk upon return</small>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-muted">Retrieving your loans...</p>
        </div>
      ) : activeLoans.length === 0 ? (
        <div className="card shadow-sm border-0 p-5 text-center mb-4 bg-white rounded-3">
          <i className="bi bi-bookmark-check display-3 text-muted mb-2"></i>
          <h5 className="fw-bold">No active borrowed volumes</h5>
          <p className="text-muted small mb-3">You do not currently have any books checked out.</p>
          <div>
            <a href="/" className="btn btn-primary btn-sm">
              <i className="bi bi-search me-1"></i> Browse Library Catalog
            </a>
          </div>
        </div>
      ) : (
        <div className="row g-3 mb-5">
          {activeLoans.map((loan) => {
            const today = new Date();
            const borrowDate = new Date(loan.borrow_date);
            const daysHeld = Math.max(0, Math.floor((today - borrowDate) / (1000 * 60 * 60 * 24)));
            const isOverdue = new Date(loan.due_date) < today;
            const daysOverdue = isOverdue
              ? Math.floor((today - new Date(loan.due_date)) / (1000 * 60 * 60 * 24))
              : 0;

            return (
              <div key={loan.id} className="col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm border-0 transition-card bg-white p-3 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className={`badge ${isOverdue ? 'bg-danger' : 'bg-success'}`}>
                      {isOverdue ? `Overdue by ${daysOverdue} days` : 'Active Checkout'}
                    </span>
                    <span className="badge bg-secondary">{daysHeld} Day(s) Held</span>
                  </div>

                  <h5 className="card-title fw-bold text-truncate mb-1" title={loan.book_details?.title}>
                    {loan.book_details?.title}
                  </h5>
                  <p className="text-muted small mb-3">by {loan.book_details?.author}</p>

                  <div className="p-2 bg-light rounded-3 small mb-3 border">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Borrowed Date:</span>
                      <strong>{loan.borrow_date}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Return Due Date:</span>
                      <strong className={isOverdue ? 'text-danger' : 'text-primary'}>{loan.due_date}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Shelf Location:</span>
                      <span>{loan.book_details?.shelf_location || 'Main'}</span>
                    </div>
                  </div>

                  {isOverdue && (
                    <div className="alert alert-danger py-1 px-2 small mb-3 text-center">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i> Overdue fine: $
                      {loan.effective_fine || loan.fine_amount}
                    </div>
                  )}

                  {/* Proof of Borrowing Button */}
                  <div className="mt-auto">
                    <button
                      className="btn btn-outline-primary w-100 btn-sm d-flex align-items-center justify-content-center gap-2"
                      onClick={() => setSelectedSlipLoanId(loan.id)}
                    >
                      <i className="bi bi-receipt-cutoff"></i>
                      Download Borrow Proof Slip
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Borrowing History */}
      <h4 className="fw-bold mb-3">
        <i className="bi bi-clock-history text-secondary me-2"></i>
        Past Borrowing History & Returned Volumes
      </h4>
      <div className="card shadow-sm border-0 bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Book Title</th>
                <th>Author & ISBN</th>
                <th>Borrowed On</th>
                <th>Due Date</th>
                <th>Returned On</th>
                <th>Fine Status</th>
                <th className="text-center">Borrow Proof</th>
              </tr>
            </thead>
            <tbody>
              {pastLoans.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No past borrowing history records found.
                  </td>
                </tr>
              ) : (
                pastLoans.map((loan) => (
                  <tr key={loan.id}>
                    <td>
                      <div className="fw-bold text-dark">{loan.book_details?.title}</div>
                    </td>
                    <td>
                      <small className="text-muted">
                        {loan.book_details?.author} (ISBN: {loan.book_details?.isbn})
                      </small>
                    </td>
                    <td>{loan.borrow_date}</td>
                    <td>{loan.due_date}</td>
                    <td>
                      <span className="badge bg-light text-dark border">{loan.return_date || 'N/A'}</span>
                    </td>
                    <td>
                      {parseFloat(loan.fine_amount || '0') > 0 ? (
                        <span className={`badge ${loan.fine_paid ? 'bg-success' : 'bg-danger'}`}>
                          ${loan.fine_amount} {loan.fine_paid ? 'Paid' : 'Unpaid'}
                        </span>
                      ) : (
                        <span className="badge bg-light text-muted">No Fine</span>
                      )}
                    </td>
                    <td className="text-center">
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setSelectedSlipLoanId(loan.id)}
                        title="View Official Receipt Slip"
                      >
                        <i className="bi bi-receipt me-1"></i> View Slip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
