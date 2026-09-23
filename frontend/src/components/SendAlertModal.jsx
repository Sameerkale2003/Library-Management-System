import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function SendAlertModal({ loan, onClose, onAlertSent }) {
  const student = loan?.user_details || {};
  const book = loan?.book_details || {};

  const [phone, setPhone] = useState(student.phone_number || '');
  const [alertType, setAlertType] = useState(loan?.is_overdue ? 'OVERDUE' : 'DUE_SOON');
  const [channel, setChannel] = useState('BOTH');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Calculate days held
  const today = new Date();
  const borrowDate = new Date(loan.borrow_date);
  const daysHeld = Math.max(0, Math.floor((today - borrowDate) / (1000 * 60 * 60 * 24)));
  const isOverdue = loan.status === 'ISSUED' && new Date(loan.due_date) < today;
  const daysOverdue = isOverdue
    ? Math.floor((today - new Date(loan.due_date)) / (1000 * 60 * 60 * 24))
    : 0;

  useEffect(() => {
    const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username;
    if (isOverdue) {
      setMessage(
        `URGENT LIBRARY NOTICE: Hello ${studentName}, your borrowed volume "${book.title}" is OVERDUE by ${daysOverdue} day(s) (Due Date: ${loan.due_date}). You have had this book for ${daysHeld} days. Accrued late fine: $${loan.effective_fine || '0.00'}. Please return it to the Central Library immediately to avoid suspension.`
      );
    } else {
      setMessage(
        `CENTRAL LIBRARY REMINDER: Hello ${studentName}, this is a friendly reminder that you have had the book "${book.title}" for ${daysHeld} day(s). Its scheduled return due date is ${loan.due_date}. Thank you for returning or renewing on time!`
      );
    }
  }, [loan, isOverdue, daysHeld, daysOverdue]);

  const handleSendAlert = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/alerts/send-alert/', {
        student_id: loan.user,
        loan_id: loan.id,
        phone_number: phone,
        alert_type: alertType,
        channel: channel,
        message: message,
      });

      setSuccessData(res.data);
      if (onAlertSent) {
        onAlertSent(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to dispatch phone alert.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchWhatsApp = () => {
    if (successData?.whatsapp_url) {
      window.open(successData.whatsapp_url, '_blank');
    } else {
      // Build immediate link if not already dispatched
      const cleaned = phone.replace(/[^0-9]/g, '');
      const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div
      className="modal show fade d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <i className="bi bi-chat-dots-fill"></i>
              Send Student Phone Alert
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSendAlert}>
            <div className="modal-body p-4">
              {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

              {successData ? (
                <div className="text-center py-3">
                  <div className="bg-success-subtle text-success p-3 rounded-circle d-inline-block mb-3">
                    <i className="bi bi-check-circle-fill fs-1"></i>
                  </div>
                  <h5 className="fw-bold text-dark">Alert Dispatched & Logged!</h5>
                  <p className="text-muted small">
                    Notification successfully recorded in system for <strong>{student.username}</strong> ({phone}).
                  </p>
                  <div className="d-grid gap-2 mt-4">
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={handleLaunchWhatsApp}
                    >
                      <i className="bi bi-whatsapp me-2"></i> Open WhatsApp Web / App Now
                    </button>
                    <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Loan & Student Summary Pill */}
                  <div className="p-3 bg-light rounded-3 border mb-3 small">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Student:</span>
                      <strong className="text-dark">
                        {student.first_name ? `${student.first_name} ${student.last_name}` : student.username} ({student.membership_id})
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Book Borrowed:</span>
                      <strong className="text-dark text-truncate" style={{ maxWidth: '240px' }}>
                        {book.title}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Duration Held:</span>
                      <span className="badge bg-secondary">{daysHeld} Day(s) with student</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Return Status:</span>
                      <span className={`badge ${isOverdue ? 'bg-danger' : 'bg-success'}`}>
                        {isOverdue ? `Overdue by ${daysOverdue} days` : `Due on ${loan.due_date}`}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Student Phone Number *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <i className="bi bi-telephone text-muted"></i>
                      </span>
                      <input
                        type="tel"
                        className="form-control"
                        required
                        placeholder="e.g. +1234567890 or 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <small className="text-muted">
                      Include country code if sending international WhatsApp (e.g., +1, +91).
                    </small>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold">Alert Category</label>
                      <select
                        className="form-select form-select-sm"
                        value={alertType}
                        onChange={(e) => setAlertType(e.target.value)}
                      >
                        <option value="DUE_SOON">Due Date Reminder</option>
                        <option value="OVERDUE">Overdue Warning</option>
                        <option value="CUSTOM">General Notice</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold">Dispatch Channel</label>
                      <select
                        className="form-select form-select-sm"
                        value={channel}
                        onChange={(e) => setChannel(e.target.value)}
                      >
                        <option value="BOTH">WhatsApp & SMS</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="SMS">SMS Message</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Alert Message Text *</label>
                    <textarea
                      className="form-control small"
                      rows="4"
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    ></textarea>
                  </div>
                </>
              )}
            </div>

            {!successData && (
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm"
                  onClick={handleLaunchWhatsApp}
                  disabled={!phone}
                >
                  <i className="bi bi-whatsapp me-1"></i> Instant WhatsApp
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !phone}>
                  {loading ? 'Logging Alert...' : 'Record & Send Alert'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
