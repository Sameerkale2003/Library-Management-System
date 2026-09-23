import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export default function BorrowSlipModal({ loanId, onClose }) {
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loanId) return;
    const fetchSlip = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/reports/borrow-slip/${loanId}/`);
        setSlip(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to generate borrow proof slip.');
      } finally {
        setLoading(false);
      }
    };
    fetchSlip();
  }, [loanId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="modal show fade d-block no-print-backdrop"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-dark text-white no-print">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <i className="bi bi-receipt-cutoff text-primary"></i>
              Official Book Borrow Proof Slip
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4">
            {loading ? (
              <div className="text-center py-5 no-print">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-2 text-muted">Retrieving official circulation certificate...</p>
              </div>
            ) : error ? (
              <div className="alert alert-danger no-print">{error}</div>
            ) : slip ? (
              <div className="borrow-slip printable-area">
                {/* Header */}
                <div className="borrow-slip-header text-center">
                  <div className="d-flex justify-content-center align-items-center gap-2 mb-1">
                    <i className="bi bi-book-half text-primary fs-3"></i>
                    <h4 className="fw-bold text-dark mb-0">{slip.library.name}</h4>
                  </div>
                  <p className="text-muted small mb-1">
                    {slip.library.branch} &bull; {slip.library.address}
                  </p>
                  <p className="text-muted small mb-0">
                    Tel: {slip.library.phone} | Email: {slip.library.email}
                  </p>
                  <div className="mt-3">
                    <span className="badge bg-primary text-uppercase px-3 py-2">
                      Official Proof of Borrowing / Issue Slip
                    </span>
                  </div>
                </div>

                {/* Slip Meta */}
                <div className="row g-2 mb-3 pb-2 border-bottom small">
                  <div className="col-6">
                    <strong className="text-muted">Receipt Slip No:</strong>{' '}
                    <span className="fw-bold">{slip.slip_number}</span>
                  </div>
                  <div className="col-6 text-end">
                    <strong className="text-muted">Verification Ref:</strong>{' '}
                    <span className="borrow-slip-barcode">{slip.transaction_ref}</span>
                  </div>
                </div>

                {/* Student & Book Details Box */}
                <div className="row g-4 mb-4">
                  {/* Student Details */}
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 h-100 border">
                      <h6 className="fw-bold text-primary mb-2">
                        <i className="bi bi-person-badge me-1"></i> Borrower Information
                      </h6>
                      <table className="table table-sm table-borderless mb-0 small">
                        <tbody>
                          <tr>
                            <td className="text-muted ps-0">Full Name:</td>
                            <td className="fw-bold">{slip.student.name}</td>
                          </tr>
                          <tr>
                            <td className="text-muted ps-0">Membership ID:</td>
                            <td className="fw-bold">{slip.student.membership_id}</td>
                          </tr>
                          <tr>
                            <td className="text-muted ps-0">Contact Phone:</td>
                            <td>{slip.student.phone_number}</td>
                          </tr>
                          <tr>
                            <td className="text-muted ps-0">Email:</td>
                            <td>{slip.student.email}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Book Details */}
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded-3 h-100 border">
                      <h6 className="fw-bold text-primary mb-2">
                        <i className="bi bi-journal-check me-1"></i> Volume Issued
                      </h6>
                      <table className="table table-sm table-borderless mb-0 small">
                        <tbody>
                          <tr>
                            <td className="text-muted ps-0">Book Title:</td>
                            <td className="fw-bold">{slip.book.title}</td>
                          </tr>
                          <tr>
                            <td className="text-muted ps-0">Author:</td>
                            <td>{slip.book.author}</td>
                          </tr>
                          <tr>
                            <td className="text-muted ps-0">ISBN:</td>
                            <td>{slip.book.isbn}</td>
                          </tr>
                          <tr>
                            <td className="text-muted ps-0">Shelf Location:</td>
                            <td className="fw-bold text-dark">{slip.book.shelf_location}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Circulation Schedule */}
                <div className="card border-primary mb-3 bg-white">
                  <div className="card-body p-3">
                    <div className="row text-center small">
                      <div className="col-4 border-end">
                        <span className="text-muted d-block mb-1">Issue Date</span>
                        <strong className="text-dark fs-6">{slip.issue_date}</strong>
                      </div>
                      <div className="col-4 border-end">
                        <span className="text-muted d-block mb-1">Due Date</span>
                        <strong className="text-danger fs-6">{slip.due_date}</strong>
                      </div>
                      <div className="col-4">
                        <span className="text-muted d-block mb-1">Duration Allowed</span>
                        <strong className="text-primary fs-6">{slip.days_allocated} Days</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms and Signatures */}
                <div className="mb-4">
                  <h6 className="fw-bold small text-muted text-uppercase mb-2">Regulations & Policy:</h6>
                  <ul className="text-muted small ps-3 mb-0">
                    {slip.terms.map((term, index) => (
                      <li key={index}>{term}</li>
                    ))}
                  </ul>
                </div>

                {/* Signature and Stamp */}
                <div className="row pt-4 mt-2 border-top text-center">
                  <div className="col-6">
                    <div className="border-bottom mx-auto mb-1" style={{ width: '160px', height: '35px' }}></div>
                    <small className="text-muted">Borrower Signature</small>
                  </div>
                  <div className="col-6">
                    <div className="border-bottom mx-auto mb-1" style={{ width: '160px', height: '35px' }}></div>
                    <small className="text-muted">Librarian Signature / Stamp</small>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="modal-footer bg-light no-print">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn btn-primary" onClick={handlePrint} disabled={!slip}>
              <i className="bi bi-printer me-1"></i> Print / Save as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
