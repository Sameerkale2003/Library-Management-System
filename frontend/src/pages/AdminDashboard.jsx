import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import BorrowSlipModal from '../components/BorrowSlipModal';
import SendAlertModal from '../components/SendAlertModal';
import BookFormModal from '../components/BookFormModal';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('loans'); // 'overview', 'loans', 'books', 'reports', 'alerts'

  // Dashboard Stats
  const [stats, setStats] = useState({
    total_books: 0,
    total_unique_titles: 0,
    active_loans: 0,
    overdue_books: 0,
    total_fines_collected: '0.00',
    pending_fines: '0.00',
  });

  // Data
  const [loans, setLoans] = useState([]);
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [alertLogs, setAlertLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters in Loans Tab
  const [loanSearch, setLoanSearch] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState('ALL');

  // Search & Filters in Books Tab
  const [bookSearch, setBookSearch] = useState('');
  const [bookCategoryFilter, setBookCategoryFilter] = useState('');

  // Circulation Report Tab State
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [reportData, setReportData] = useState({ records: [], total_records: 0, total_fines_accrued: '0.00' });
  const [loadingReport, setLoadingReport] = useState(false);

  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueData, setIssueData] = useState({ user_id: '', book_id: '', days: 14 });
  const [issuing, setIssuing] = useState(false);

  // Book Form Modal (Add / Edit)
  const [bookModalState, setBookModalState] = useState({ show: false, book: null });

  // Delete Book Confirmation
  const [deleteBookModal, setDeleteBookModal] = useState({ show: false, book: null, deleting: false });

  // Borrow Slip Modal
  const [selectedSlipLoanId, setSelectedSlipLoanId] = useState(null);

  // Send Phone Alert Modal
  const [selectedAlertLoan, setSelectedAlertLoan] = useState(null);

  // Toast
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, loansRes, usersRes, booksRes, catRes] = await Promise.all([
        api.get('/dashboard/analytics/'),
        api.get('/borrow-records/?ordering=-borrow_date'),
        api.get('/auth/users/'),
        api.get('/books/'),
        api.get('/categories/'),
      ]);
      setStats(statsRes.data);
      setLoans(loansRes.data.results || loansRes.data);
      setUsers(usersRes.data.results || usersRes.data);
      setBooks(booksRes.data.results || booksRes.data);
      setCategories(catRes.data.results || catRes.data);
    } catch (err) {
      showToast('danger', 'Failed to load system data from server.');
    } finally {
      setLoading(false);
    }
  };

  const loadAlertLogs = async () => {
    try {
      const res = await api.get('/alerts/logs/');
      setAlertLogs(res.data.results || res.data);
    } catch (e) {
      console.error('Failed to load alert logs', e);
    }
  };

  const loadReport = async () => {
    setLoadingReport(true);
    try {
      let url = `/reports/circulation/?`;
      if (reportStartDate) url += `start_date=${reportStartDate}&`;
      if (reportEndDate) url += `end_date=${reportEndDate}&`;
      if (reportStatus) url += `status=${reportStatus}&`;
      if (reportSearch) url += `search=${encodeURIComponent(reportSearch)}&`;

      const res = await api.get(url);
      setReportData(res.data);
    } catch (err) {
      showToast('danger', 'Failed to generate circulation report.');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'alerts') {
      loadAlertLogs();
    } else if (activeTab === 'reports') {
      loadReport();
    }
  }, [activeTab]);

  // Issue Book
  const handleManualIssue = async (e) => {
    e.preventDefault();
    setIssuing(true);
    try {
      const res = await api.post('/borrow-records/issue-book/', issueData);
      showToast('success', 'Book issued successfully to student!');
      setShowIssueModal(false);
      setIssueData({ user_id: '', book_id: '', days: 14 });
      loadData();
      // Optionally open proof slip immediately
      if (res.data?.id) {
        setSelectedSlipLoanId(res.data.id);
      }
    } catch (err) {
      showToast('danger', err.response?.data?.error || 'Failed to issue book.');
    } finally {
      setIssuing(false);
    }
  };

  // Return Book
  const handleReturnBook = async (recordId) => {
    if (!window.confirm('Check in this volume? Stock will be incremented immediately.')) return;
    try {
      const res = await api.post(`/borrow-records/${recordId}/return-book/`);
      showToast('success', `Book checked in! Overdue fine assessed: $${res.data.fine_amount}`);
      loadData();
    } catch (err) {
      showToast('danger', err.response?.data?.error || 'Failed to process return.');
    }
  };

  // Pay Fine
  const handlePayFine = async (recordId) => {
    try {
      await api.post(`/borrow-records/${recordId}/pay-fine/`);
      showToast('success', 'Fine marked as settled.');
      loadData();
    } catch (err) {
      showToast('danger', err.response?.data?.error || 'Failed to settle fine.');
    }
  };

  // Delete Book
  const handleDeleteBook = async () => {
    if (!deleteBookModal.book) return;
    setDeleteBookModal((prev) => ({ ...prev, deleting: true }));
    try {
      await api.delete(`/books/${deleteBookModal.book.id}/`);
      showToast('success', `Book "${deleteBookModal.book.title}" was deleted from the library catalog.`);
      setDeleteBookModal({ show: false, book: null, deleting: false });
      loadData();
    } catch (err) {
      showToast('danger', err.response?.data?.error || 'Failed to delete book.');
      setDeleteBookModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  // Clear Demo Books
  const handleClearDemoBooks = async () => {
    if (!window.confirm('Are you sure you want to delete demo/seed books? This will remove sample books and their test loans.')) return;
    try {
      const res = await api.post('/books/clear-demo-books/');
      showToast('success', res.data.message || 'Demo books deleted successfully!');
      loadData();
    } catch (err) {
      showToast('danger', err.response?.data?.error || 'Failed to clear demo books.');
    }
  };

  // Export CSV Report
  const handleExportCSV = () => {
    let url = `${api.defaults.baseURL || '/api'}/reports/circulation/export-csv/?`;
    if (reportStartDate) url += `start_date=${reportStartDate}&`;
    if (reportEndDate) url += `end_date=${reportEndDate}&`;
    if (reportStatus) url += `status=${reportStatus}&`;
    if (reportSearch) url += `search=${encodeURIComponent(reportSearch)}&`;

    const token = localStorage.getItem('access_token');
    // Open in browser or download via fetch
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `circulation_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => showToast('danger', 'Failed to download CSV report.'));
  };

  // Filtered Loans
  const filteredLoans = loans.filter((l) => {
    const username = (l.user_details?.username || '').toLowerCase();
    const studentName = `${l.user_details?.first_name || ''} ${l.user_details?.last_name || ''}`.toLowerCase();
    const title = (l.book_details?.title || '').toLowerCase();
    const isbn = (l.book_details?.isbn || '').toLowerCase();
    const q = loanSearch.toLowerCase();
    const matchesSearch = username.includes(q) || studentName.includes(q) || title.includes(q) || isbn.includes(q);

    if (!matchesSearch) return false;

    const isOverdue = l.status === 'ISSUED' && new Date(l.due_date) < new Date();
    if (loanStatusFilter === 'ISSUED') return l.status === 'ISSUED' && !isOverdue;
    if (loanStatusFilter === 'OVERDUE') return isOverdue;
    if (loanStatusFilter === 'RETURNED') return l.status === 'RETURNED';
    return true;
  });

  // Filtered Books
  const filteredBooks = books.filter((b) => {
    const title = (b.title || '').toLowerCase();
    const author = (b.author || '').toLowerCase();
    const isbn = (b.isbn || '').toLowerCase();
    const q = bookSearch.toLowerCase();
    const matchesSearch = title.includes(q) || author.includes(q) || isbn.includes(q);
    if (!matchesSearch) return false;
    if (bookCategoryFilter && String(b.category) !== String(bookCategoryFilter)) return false;
    return true;
  });

  return (
    <div className="container-fluid py-4 px-md-5">
      {/* Toast Alert */}
      {toast.show && (
        <div
          className={`alert alert-${toast.type} alert-dismissible fade show position-fixed top-0 end-0 m-3 shadow`}
          style={{ zIndex: 1090 }}
        >
          {toast.message}
          <button type="button" className="btn-close" onClick={() => setToast({ show: false, type: '', message: '' })}></button>
        </div>
      )}

      {/* Modals */}
      {selectedSlipLoanId && (
        <BorrowSlipModal loanId={selectedSlipLoanId} onClose={() => setSelectedSlipLoanId(null)} />
      )}

      {selectedAlertLoan && (
        <SendAlertModal
          loan={selectedAlertLoan}
          onClose={() => setSelectedAlertLoan(null)}
          onAlertSent={() => {
            showToast('success', 'Phone alert message logged and sent!');
            loadData();
          }}
        />
      )}

      {bookModalState.show && (
        <BookFormModal
          book={bookModalState.book}
          categories={categories}
          onClose={() => setBookModalState({ show: false, book: null })}
          onSave={(savedBook, mode) => {
            showToast('success', `Book "${savedBook.title}" successfully ${mode}!`);
            loadData();
          }}
        />
      )}

      {/* Delete Book Modal */}
      {deleteBookModal.show && (
        <div className="modal show fade d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">Confirm Book Deletion</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setDeleteBookModal({ show: false, book: null, deleting: false })}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="mb-1">
                  Are you sure you want to permanently remove <strong>"{deleteBookModal.book?.title}"</strong> (ISBN: {deleteBookModal.book?.isbn}) from the library?
                </p>
                <p className="text-muted small mb-0">
                  Note: If any copies are currently checked out by students, the system will prevent deletion.
                </p>
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setDeleteBookModal({ show: false, book: null, deleting: false })}
                  disabled={deleteBookModal.deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleDeleteBook}
                  disabled={deleteBookModal.deleting}
                >
                  {deleteBookModal.deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="badge bg-primary text-uppercase px-2 py-1">Admin / Librarian</span>
            <h2 className="fw-bold mb-0 text-dark">Librarian Operations Console</h2>
          </div>
          <p className="text-muted small mb-0">
            Manage book inventory, track student loans & duration, send phone alerts, and generate reports.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-outline-primary btn-sm" onClick={loadData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
          <button className="btn btn-outline-danger btn-sm" onClick={handleClearDemoBooks} title="Delete seed/demo books">
            <i className="bi bi-trash3 me-1"></i> Clear Demo Books
          </button>
          <button className="btn btn-outline-dark btn-sm" onClick={() => setBookModalState({ show: true, book: null })}>
            <i className="bi bi-plus-circle me-1"></i> Add New Book
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowIssueModal(true)}>
            <i className="bi bi-box-arrow-up-right me-1"></i> Issue Book Manually
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-pills nav-pills-custom mb-4 bg-white p-2 rounded-3 shadow-sm border">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'loans' ? 'active' : ''}`}
            onClick={() => setActiveTab('loans')}
          >
            <i className="bi bi-person-lines-fill me-2"></i>
            Student Loans & Alerts ({loans.filter((l) => l.status === 'ISSUED').length} Active)
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'books' ? 'active' : ''}`}
            onClick={() => setActiveTab('books')}
          >
            <i className="bi bi-journal-album me-2"></i>
            Book Inventory CRUD ({books.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <i className="bi bi-file-earmark-bar-graph me-2"></i>
            Circulation Reports & Exports
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <i className="bi bi-chat-left-dots me-2"></i>
            Alerts History Log
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="bi bi-speedometer2 me-2"></i>
            Overview KPIs
          </button>
        </li>
      </ul>

      {/* ==================== TAB 1: OVERVIEW KPIS ==================== */}
      {activeTab === 'overview' && (
        <div>
          <div className="row g-3 mb-4">
            <div className="col-xl-3 col-sm-6">
              <div className="card shadow-sm border-0 border-start border-primary border-4 stats-card bg-white p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-uppercase text-muted small fw-bold mb-1">Total Volumes</h6>
                    <h3 className="fw-bold mb-0 text-dark">{stats.total_books}</h3>
                    <small className="text-muted">{stats.total_unique_titles} unique titles</small>
                  </div>
                  <div className="bg-primary-subtle text-primary p-3 rounded-circle">
                    <i className="bi bi-journal-album fs-3"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-sm-6">
              <div className="card shadow-sm border-0 border-start border-info border-4 stats-card bg-white p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-uppercase text-muted small fw-bold mb-1">Active Loans</h6>
                    <h3 className="fw-bold mb-0 text-dark">{stats.active_loans}</h3>
                    <small className="text-info">Circulating with students</small>
                  </div>
                  <div className="bg-info-subtle text-info p-3 rounded-circle">
                    <i className="bi bi-arrow-repeat fs-3"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-sm-6">
              <div className="card shadow-sm border-0 border-start border-danger border-4 stats-card bg-white p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-uppercase text-muted small fw-bold mb-1">Overdue Loans</h6>
                    <h3 className="fw-bold mb-0 text-danger">{stats.overdue_books}</h3>
                    <small className="text-danger">Action required (Phone alert)</small>
                  </div>
                  <div className="bg-danger-subtle text-danger p-3 rounded-circle">
                    <i className="bi bi-exclamation-triangle fs-3"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-sm-6">
              <div className="card shadow-sm border-0 border-start border-success border-4 stats-card bg-white p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-uppercase text-muted small fw-bold mb-1">Fines Collected</h6>
                    <h3 className="fw-bold mb-0 text-success">${stats.total_fines_collected}</h3>
                    <small className="text-muted">${stats.pending_fines} pending settlement</small>
                  </div>
                  <div className="bg-success-subtle text-success p-3 rounded-circle">
                    <i className="bi bi-cash-stack fs-3"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0 p-4 bg-white">
            <h5 className="fw-bold mb-3">Quick Navigation</h5>
            <div className="row g-3">
              <div className="col-md-4">
                <div
                  className="p-3 border rounded-3 text-center cursor-pointer bg-light h-100"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveTab('loans')}
                >
                  <i className="bi bi-bell-fill fs-2 text-warning mb-2 d-block"></i>
                  <h6 className="fw-bold">Send Student Alerts</h6>
                  <p className="small text-muted mb-0">Check overdue durations & message student phone numbers.</p>
                </div>
              </div>
              <div className="col-md-4">
                <div
                  className="p-3 border rounded-3 text-center cursor-pointer bg-light h-100"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveTab('books')}
                >
                  <i className="bi bi-journal-plus fs-2 text-primary mb-2 d-block"></i>
                  <h6 className="fw-bold">Manage Book Collection</h6>
                  <p className="small text-muted mb-0">Add, edit, delete books, update stock counts & shelf locations.</p>
                </div>
              </div>
              <div className="col-md-4">
                <div
                  className="p-3 border rounded-3 text-center cursor-pointer bg-light h-100"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveTab('reports')}
                >
                  <i className="bi bi-file-earmark-spreadsheet fs-2 text-success mb-2 d-block"></i>
                  <h6 className="fw-bold">Export Circulation Report</h6>
                  <p className="small text-muted mb-0">Download CSV report showing which student borrowed which book & days held.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: STUDENT LOAN TRACKER & PHONE ALERTS ==================== */}
      {activeTab === 'loans' && (
        <div className="card shadow-sm border-0 bg-white">
          <div className="card-header bg-white py-3 border-0 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <h5 className="card-title fw-bold mb-1">
                <i className="bi bi-person-lines-fill me-2 text-primary"></i>
                Student Circulation & Loan Duration Tracker
              </h5>
              <p className="text-muted small mb-0">
                Track how many days each student has kept a book, send phone alerts, and print borrow proof slips.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <input
                type="text"
                className="form-control form-control-sm"
                style={{ width: '220px' }}
                placeholder="Search student or book..."
                value={loanSearch}
                onChange={(e) => setLoanSearch(e.target.value)}
              />
              <select
                className="form-select form-select-sm"
                style={{ width: '150px' }}
                value={loanStatusFilter}
                onChange={(e) => setLoanStatusFilter(e.target.value)}
              >
                <option value="ALL">All Loans</option>
                <option value="ISSUED">Active (On Time)</option>
                <option value="OVERDUE">Overdue Only</option>
                <option value="RETURNED">Returned</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Student / Member</th>
                  <th>Student Phone</th>
                  <th>Book Title & ISBN</th>
                  <th>Borrow Date</th>
                  <th>Due Date</th>
                  <th>Days Held</th>
                  <th>Status & Alert</th>
                  <th>Fine</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Loading loan records...
                    </td>
                  </tr>
                ) : filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      No loan records matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map((loan) => {
                    const today = new Date();
                    const borrowDate = new Date(loan.borrow_date);
                    const daysHeld = Math.max(0, Math.floor((today - borrowDate) / (1000 * 60 * 60 * 24)));
                    const isOverdue = loan.status === 'ISSUED' && new Date(loan.due_date) < today;
                    const daysOverdue = isOverdue
                      ? Math.floor((today - new Date(loan.due_date)) / (1000 * 60 * 60 * 24))
                      : 0;

                    const studentPhone = loan.user_details?.phone_number;

                    return (
                      <tr key={loan.id} className={isOverdue ? 'table-danger-subtle' : ''}>
                        <td>
                          <div className="fw-bold text-dark">
                            {loan.user_details?.first_name ? `${loan.user_details?.first_name} ${loan.user_details?.last_name}` : loan.user_details?.username}
                          </div>
                          <small className="text-muted">
                            {loan.user_details?.membership_id || `ID: ${loan.user}`}
                          </small>
                        </td>

                        <td>
                          {studentPhone ? (
                            <span className="badge bg-light text-dark border">
                              <i className="bi bi-telephone text-primary me-1"></i>
                              {studentPhone}
                            </span>
                          ) : (
                            <span className="text-muted small fst-italic">No phone registered</span>
                          )}
                        </td>

                        <td>
                          <div className="fw-semibold text-truncate" style={{ maxWidth: '240px' }} title={loan.book_details?.title}>
                            {loan.book_details?.title}
                          </div>
                          <small className="text-muted">ISBN: {loan.book_details?.isbn}</small>
                        </td>

                        <td>{loan.borrow_date}</td>

                        <td>
                          <span className={isOverdue ? 'text-danger fw-bold' : ''}>
                            {loan.due_date}
                          </span>
                        </td>

                        <td>
                          <span className="badge bg-secondary">
                            {daysHeld} Day(s)
                          </span>
                        </td>

                        <td>
                          {loan.status === 'RETURNED' ? (
                            <span className="badge bg-secondary">Returned</span>
                          ) : isOverdue ? (
                            <span className="badge bg-danger">
                              <i className="bi bi-exclamation-circle me-1"></i>
                              Overdue by {daysOverdue}d
                            </span>
                          ) : (
                            <span className="badge bg-success">
                              Active ({Math.max(0, Math.ceil((new Date(loan.due_date) - today) / (1000 * 60 * 60 * 24)))}d left)
                            </span>
                          )}
                        </td>

                        <td>
                          {parseFloat(loan.fine_amount || '0') > 0 || (isOverdue && parseFloat(loan.effective_fine || '0') > 0) ? (
                            <span className={`fw-bold ${loan.fine_paid ? 'text-success' : 'text-danger'}`}>
                              ${loan.fine_paid ? loan.fine_amount : (loan.effective_fine || loan.fine_amount)}
                              {loan.fine_paid ? ' (Paid)' : ' (Unpaid)'}
                            </span>
                          ) : (
                            <span className="text-muted">$0.00</span>
                          )}
                        </td>

                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-1 flex-wrap">
                            {/* Send Phone Alert Button */}
                            {loan.status === 'ISSUED' && (
                              <button
                                className={`btn btn-sm ${isOverdue ? 'btn-danger' : 'btn-outline-primary'}`}
                                onClick={() => setSelectedAlertLoan(loan)}
                                title="Send SMS / WhatsApp alert to student phone"
                              >
                                <i className="bi bi-chat-dots me-1"></i> Send Alert
                              </button>
                            )}

                            {/* Download / Print Borrow Slip (Proof) */}
                            <button
                              className="btn btn-outline-dark btn-sm"
                              onClick={() => setSelectedSlipLoanId(loan.id)}
                              title="Download / Print Official Borrow Proof Slip for Student"
                            >
                              <i className="bi bi-receipt me-1"></i> Proof Slip
                            </button>

                            {/* Return Book */}
                            {loan.status === 'ISSUED' && (
                              <button
                                className="btn btn-outline-success btn-sm"
                                onClick={() => handleReturnBook(loan.id)}
                                title="Receive Return & Restock Copy"
                              >
                                <i className="bi bi-box-arrow-in-down me-1"></i> Return
                              </button>
                            )}

                            {/* Clear Fine */}
                            {!loan.fine_paid && parseFloat(loan.fine_amount || '0') > 0 && (
                              <button
                                className="btn btn-outline-warning btn-sm"
                                onClick={() => handlePayFine(loan.id)}
                                title="Mark Fine as Paid"
                              >
                                Settle Fine
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: BOOK INVENTORY CRUD ==================== */}
      {activeTab === 'books' && (
        <div className="card shadow-sm border-0 bg-white">
          <div className="card-header bg-white py-3 border-0 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <h5 className="card-title fw-bold mb-1">
                <i className="bi bi-journal-album me-2 text-primary"></i>
                Book Collection Management (CRUD)
              </h5>
              <p className="text-muted small mb-0">
                Add, update, or remove books. View shelf locations, total copies, and stock counts.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <input
                type="text"
                className="form-control form-control-sm"
                style={{ width: '220px' }}
                placeholder="Search title, author, ISBN..."
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
              />
              <select
                className="form-select form-select-sm"
                style={{ width: '160px' }}
                value={bookCategoryFilter}
                onChange={(e) => setBookCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setBookModalState({ show: true, book: null })}
              >
                <i className="bi bi-plus-circle me-1"></i> Add Book
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>Cover</th>
                  <th>Title & Author</th>
                  <th>ISBN</th>
                  <th>Category</th>
                  <th>Shelf Location</th>
                  <th>Copies Available</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      No books found in collection.
                    </td>
                  </tr>
                ) : (
                  filteredBooks.map((book) => {
                    const isOutOfStock = book.available_copies === 0;
                    return (
                      <tr key={book.id}>
                        <td>
                          <img
                            src={book.cover_image_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=100&q=80'}
                            alt={book.title}
                            className="rounded shadow-sm"
                            style={{ width: '40px', height: '55px', objectFit: 'cover' }}
                          />
                        </td>
                        <td>
                          <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '280px' }} title={book.title}>
                            {book.title}
                          </div>
                          <small className="text-muted">{book.author}</small>
                        </td>
                        <td>
                          <code className="text-dark small">{book.isbn}</code>
                        </td>
                        <td>
                          <span className="badge bg-light text-primary border">
                            {book.category_name || 'General'}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-secondary-subtle text-dark">
                            <i className="bi bi-geo-alt me-1 text-primary"></i>
                            {book.shelf_location || 'Main Shelf'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${isOutOfStock ? 'bg-danger' : 'bg-success'}`}>
                            {book.available_copies} of {book.total_copies} Left
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-1">
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => setBookModalState({ show: true, book })}
                              title="Edit Book Details"
                            >
                              <i className="bi bi-pencil-square me-1"></i> Edit
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => setDeleteBookModal({ show: true, book, deleting: false })}
                              title="Delete Book"
                            >
                              <i className="bi bi-trash me-1"></i> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: CIRCULATION REPORTS ==================== */}
      {activeTab === 'reports' && (
        <div className="card shadow-sm border-0 bg-white">
          <div className="card-header bg-white py-3 border-0">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div>
                <h5 className="card-title fw-bold mb-1">
                  <i className="bi bi-file-earmark-bar-graph me-2 text-primary"></i>
                  Official Circulation Report & Export
                </h5>
                <p className="text-muted small mb-0">
                  Detailed report of which student borrowed which book, on what date, and for how many days.
                </p>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-dark btn-sm" onClick={() => window.print()}>
                  <i className="bi bi-printer me-1"></i> Print Report
                </button>
                <button className="btn btn-success btn-sm" onClick={handleExportCSV}>
                  <i className="bi bi-file-earmark-spreadsheet me-1"></i> Download CSV
                </button>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="row g-2 mt-3 pt-3 border-top no-print">
              <div className="col-md-3">
                <label className="form-label small fw-bold mb-1">From Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold mb-1">To Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold mb-1">Status Filter</label>
                <select
                  className="form-select form-select-sm"
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="ISSUED">Currently Issued</option>
                  <option value="OVERDUE">Overdue Only</option>
                  <option value="RETURNED">Returned</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-bold mb-1">Search Keyword</label>
                <div className="input-group input-group-sm">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Student, book, ISBN..."
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={loadReport}>
                    Filter
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Report Summary Card */}
          <div className="p-3 bg-light border-top border-bottom">
            <div className="row text-center small">
              <div className="col-4 border-end">
                <span className="text-muted d-block">Total Records</span>
                <strong className="fs-6 text-dark">{reportData.total_records} Records</strong>
              </div>
              <div className="col-4 border-end">
                <span className="text-muted d-block">Report Generated Date</span>
                <strong className="fs-6 text-primary">{reportData.report_date || 'Today'}</strong>
              </div>
              <div className="col-4">
                <span className="text-muted d-block">Total Overdue Fines</span>
                <strong className="fs-6 text-danger">${reportData.total_fines_accrued}</strong>
              </div>
            </div>
          </div>

          {/* Printable Report Table */}
          <div className="table-responsive printable-area">
            <table className="table table-bordered table-hover align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Membership ID</th>
                  <th>Phone Number</th>
                  <th>Book Title</th>
                  <th>ISBN</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Return Date</th>
                  <th>Days Held</th>
                  <th>Status</th>
                  <th>Fine ($)</th>
                </tr>
              </thead>
              <tbody>
                {loadingReport ? (
                  <tr>
                    <td colSpan="12" className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                      Compiling circulation report...
                    </td>
                  </tr>
                ) : reportData.records?.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="text-center py-5 text-muted">
                      No records match the report filter.
                    </td>
                  </tr>
                ) : (
                  reportData.records?.map((r, index) => (
                    <tr key={r.loan_id}>
                      <td>{index + 1}</td>
                      <td className="fw-bold">{r.student_name}</td>
                      <td>{r.student_membership_id}</td>
                      <td>{r.student_phone}</td>
                      <td className="fw-semibold">{r.book_title}</td>
                      <td><code>{r.book_isbn}</code></td>
                      <td>{r.borrow_date}</td>
                      <td>{r.due_date}</td>
                      <td>{r.return_date || 'Still Issued'}</td>
                      <td>
                        <span className="badge bg-secondary">{r.days_held} Days</span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            r.status === 'RETURNED'
                              ? 'bg-secondary'
                              : r.status === 'OVERDUE'
                              ? 'bg-danger'
                              : 'bg-primary'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="fw-bold text-end">${r.fine_amount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: ALERTS HISTORY LOG ==================== */}
      {activeTab === 'alerts' && (
        <div className="card shadow-sm border-0 bg-white">
          <div className="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center">
            <div>
              <h5 className="card-title fw-bold mb-1">
                <i className="bi bi-chat-left-dots me-2 text-primary"></i>
                Student Phone Alerts & Reminders Log
              </h5>
              <p className="text-muted small mb-0">
                Audit trail of all SMS and WhatsApp messages sent to students.
              </p>
            </div>
            <button className="btn btn-outline-primary btn-sm" onClick={loadAlertLogs}>
              <i className="bi bi-arrow-clockwise me-1"></i> Refresh Logs
            </button>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Timestamp</th>
                  <th>Student</th>
                  <th>Phone Number</th>
                  <th>Book Reference</th>
                  <th>Alert Type</th>
                  <th>Channel</th>
                  <th>Message Sent</th>
                  <th>Sent By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {alertLogs.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      No phone alerts sent yet. Use the "Send Alert" button in the Student Loans tab to message a student.
                    </td>
                  </tr>
                ) : (
                  alertLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="small text-muted">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="fw-bold">{log.student_details?.username}</td>
                      <td>
                        <code>{log.phone_number}</code>
                      </td>
                      <td className="text-truncate" style={{ maxWidth: '180px' }}>
                        {log.book_title}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">{log.alert_type}</span>
                      </td>
                      <td>
                        <span className="badge bg-info-subtle text-info">{log.channel}</span>
                      </td>
                      <td className="small text-muted" style={{ maxWidth: '300px' }}>
                        {log.message}
                      </td>
                      <td className="small">{log.sent_by_username}</td>
                      <td>
                        <span className="badge bg-success">{log.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Issue Book Modal */}
      {showIssueModal && (
        <div className="modal show fade d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-box-arrow-up-right me-2"></i> Issue Book to Student
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowIssueModal(false)}
                ></button>
              </div>
              <form onSubmit={handleManualIssue}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Select Student / Member *</label>
                    <select
                      className="form-select"
                      required
                      value={issueData.user_id}
                      onChange={(e) => setIssueData({ ...issueData, user_id: e.target.value })}
                    >
                      <option value="">Choose User / Student</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.username} ({u.membership_id || u.email}) {u.phone_number ? `- Phone: ${u.phone_number}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Select Book to Issue *</label>
                    <select
                      className="form-select"
                      required
                      value={issueData.book_id}
                      onChange={(e) => setIssueData({ ...issueData, book_id: e.target.value })}
                    >
                      <option value="">Choose Book</option>
                      {books.map((b) => (
                        <option key={b.id} value={b.id} disabled={b.available_copies <= 0}>
                          {b.title} (Available: {b.available_copies}/{b.total_copies})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Loan Duration (Days) *</label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      className="form-control"
                      value={issueData.days}
                      onChange={(e) => setIssueData({ ...issueData, days: parseInt(e.target.value, 10) || 14 })}
                    />
                    <small className="text-muted">Default is 14 days. Due date will be calculated automatically.</small>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowIssueModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={issuing}>
                    {issuing ? 'Processing...' : 'Confirm Loan Issue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
