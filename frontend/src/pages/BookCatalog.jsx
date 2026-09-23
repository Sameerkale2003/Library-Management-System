import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import BookFormModal from '../components/BookFormModal';
import BorrowSlipModal from '../components/BorrowSlipModal';

export default function BookCatalog() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availability, setAvailability] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [bookModalState, setBookModalState] = useState({ show: false, book: null });
  const [deleteBook, setDeleteBook] = useState(null);
  const [issuedLoanId, setIssuedLoanId] = useState(null);

  // Toast feedback
  const [toast, setToast] = useState({ show: false, type: '', message: '' });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4500);
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories/');
      setCategories(res.data.results || res.data);
    } catch (e) {
      console.error('Error fetching categories', e);
    }
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      let url = `/books/?page=${page}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (selectedCategory) url += `&category=${selectedCategory}`;

      const res = await api.get(url);
      let results = res.data.results || res.data;

      if (availability === 'available') {
        results = results.filter((b) => b.available_copies > 0);
      } else if (availability === 'unavailable') {
        results = results.filter((b) => b.available_copies === 0);
      }

      setBooks(results);
      if (res.data.count) {
        setTotalPages(Math.ceil(res.data.count / 12));
      }
    } catch (err) {
      showToast('danger', 'Failed to retrieve book catalog from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchBooks();
    }, 250);
    return () => clearTimeout(delay);
  }, [searchTerm, selectedCategory, availability, page]);

  // Student Borrow
  const handleBorrowBook = async (bookId) => {
    if (!isAuthenticated) {
      showToast('warning', 'Please sign in first to borrow books.');
      return;
    }

    try {
      const res = await api.post('/borrow-records/issue-book/', {
        book_id: bookId,
        days: 14,
      });
      showToast('success', 'Book successfully checked out! Opening your official Borrow Proof Slip...');
      setSelectedBook(null);
      fetchBooks();
      if (res.data?.id) {
        setIssuedLoanId(res.data.id);
      }
    } catch (err) {
      showToast('danger', err.response?.data?.error || 'Unable to issue book.');
    }
  };

  // Admin Delete Book
  const handleDeleteBookConfirm = async () => {
    if (!deleteBook) return;
    try {
      await api.delete(`/books/${deleteBook.id}/`);
      showToast('success', `Book "${deleteBook.title}" was removed from catalog.`);
      setDeleteBook(null);
      fetchBooks();
    } catch (err) {
      showToast('danger', err.response?.data?.error || 'Failed to delete book.');
    }
  };

  return (
    <div className="container py-4">
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

      {/* Proof Slip Modal */}
      {issuedLoanId && (
        <BorrowSlipModal loanId={issuedLoanId} onClose={() => setIssuedLoanId(null)} />
      )}

      {/* Book Form Modal (Add/Edit) */}
      {bookModalState.show && (
        <BookFormModal
          book={bookModalState.book}
          categories={categories}
          onClose={() => setBookModalState({ show: false, book: null })}
          onSave={(savedBook, mode) => {
            showToast('success', `Book "${savedBook.title}" successfully ${mode}!`);
            fetchBooks();
          }}
        />
      )}

      {/* Delete Book Confirmation Modal */}
      {deleteBook && (
        <div className="modal show fade d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">Delete Book</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteBook(null)}></button>
              </div>
              <div className="modal-body p-4">
                <p>
                  Are you sure you want to delete <strong>"{deleteBook.title}"</strong> (ISBN: {deleteBook.isbn})?
                </p>
                <p className="text-muted small mb-0">
                  This action cannot be undone. Active borrowed copies cannot be deleted.
                </p>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setDeleteBook(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDeleteBookConfirm}>
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="row mb-4 align-items-center">
        <div className="col-lg-7">
          <h2 className="fw-bold text-dark mb-1">
            <i className="bi bi-collection text-primary me-2"></i>
            Library Book Catalog
          </h2>
          <p className="text-muted mb-0">
            Browse collection volumes, check live shelf availability, and instant borrow with official receipt slip.
          </p>
        </div>
        <div className="col-lg-5 text-lg-end mt-3 mt-lg-0">
          {isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => setBookModalState({ show: true, book: null })}
            >
              <i className="bi bi-plus-circle me-1"></i> Add New Book
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
        <div className="row g-3 align-items-center">
          <div className="col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0 ps-0"
                placeholder="Search by Title, Author, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-4">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories & Genres</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              <option value="all">All Copies</option>
              <option value="available">Available in Stock</option>
              <option value="unavailable">Out of Stock (0)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Book Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-muted">Loading books from database...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-5 bg-white rounded-3 shadow-sm border">
          <i className="bi bi-journal-x display-3 text-secondary"></i>
          <h5 className="mt-3 fw-bold">No books found</h5>
          <p className="text-muted">Try adjusting your search criteria or add new books to the catalog.</p>
        </div>
      ) : (
        <div className="row g-4">
          {books.map((book) => {
            const isAvailable = book.available_copies > 0;
            return (
              <div key={book.id} className="col-sm-6 col-md-4 col-lg-3">
                <div className="card h-100 shadow-sm border-0 transition-card bg-white d-flex flex-column">
                  <div className="position-relative">
                    <img
                      src={
                        book.cover_image_url ||
                        'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80'
                      }
                      className="card-img-top"
                      alt={book.title}
                      style={{ height: '210px', objectFit: 'cover' }}
                    />
                    <span
                      className={`position-absolute top-0 end-0 m-2 badge ${
                        isAvailable ? 'bg-success' : 'bg-danger'
                      }`}
                    >
                      {isAvailable ? `${book.available_copies} of ${book.total_copies} Left` : 'Out of Stock'}
                    </span>
                  </div>

                  <div className="card-body d-flex flex-column p-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="badge bg-light text-primary border text-uppercase" style={{ fontSize: '0.72rem' }}>
                        {book.category_name || 'General'}
                      </span>
                      <small className="text-muted">
                        <i className="bi bi-geo-alt me-1 text-primary"></i>
                        {book.shelf_location || 'Main'}
                      </small>
                    </div>

                    <h6 className="card-title fw-bold text-truncate mb-1 mt-1" title={book.title}>
                      {book.title}
                    </h6>
                    <p className="card-subtitle text-muted small mb-2">{book.author}</p>
                    <p className="card-text text-muted small text-truncate-2 flex-grow-1">
                      {book.description || 'No description available for this volume.'}
                    </p>

                    <div className="pt-2 border-top mt-auto d-flex justify-content-between align-items-center gap-1">
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setSelectedBook(book)}
                      >
                        Details
                      </button>

                      {isAdmin ? (
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => setBookModalState({ show: true, book })}
                            title="Edit Book"
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => setDeleteBook(book)}
                            title="Delete Book"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          className={`btn btn-sm ${isAvailable ? 'btn-primary' : 'btn-secondary'}`}
                          disabled={!isAvailable}
                          onClick={() => handleBorrowBook(book.id)}
                        >
                          <i className="bi bi-bookmark-plus me-1"></i>
                          {isAvailable ? 'Borrow' : 'Checked Out'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="d-flex justify-content-between align-items-center mt-4">
        <button
          className="btn btn-outline-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <i className="bi bi-chevron-left me-1"></i> Previous
        </button>
        <span className="small text-muted">
          Page {page} of {totalPages || 1}
        </span>
        <button
          className="btn btn-outline-secondary btn-sm"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next <i className="bi bi-chevron-right ms-1"></i>
        </button>
      </div>

      {/* Book Details Modal */}
      {selectedBook && (
        <div className="modal show fade d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">{selectedBook.title}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedBook(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row">
                  <div className="col-md-4 text-center mb-3 mb-md-0">
                    <img
                      src={
                        selectedBook.cover_image_url ||
                        'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80'
                      }
                      alt={selectedBook.title}
                      className="img-fluid rounded shadow"
                      style={{ maxHeight: '280px', objectFit: 'cover' }}
                    />
                  </div>
                  <div className="col-md-8">
                    <ul className="list-group list-group-flush mb-3 small">
                      <li className="list-group-item px-0">
                        <strong>Author:</strong> {selectedBook.author}
                      </li>
                      <li className="list-group-item px-0">
                        <strong>ISBN:</strong> {selectedBook.isbn}
                      </li>
                      <li className="list-group-item px-0">
                        <strong>Category:</strong> {selectedBook.category_name || 'General'}
                      </li>
                      <li className="list-group-item px-0">
                        <strong>Publisher:</strong> {selectedBook.publisher} ({selectedBook.published_date})
                      </li>
                      <li className="list-group-item px-0">
                        <strong>Shelf Location:</strong> {selectedBook.shelf_location}
                      </li>
                      <li className="list-group-item px-0">
                        <strong>Copies Available:</strong>{' '}
                        <span className={`badge ${selectedBook.available_copies > 0 ? 'bg-success' : 'bg-danger'}`}>
                          {selectedBook.available_copies} of {selectedBook.total_copies} Left
                        </span>
                      </li>
                    </ul>
                    <h6 className="fw-bold small text-uppercase text-muted">Description</h6>
                    <p className="text-muted small">
                      {selectedBook.description || 'No description provided for this volume.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setSelectedBook(null)}>
                  Close
                </button>
                {isAdmin ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const b = selectedBook;
                      setSelectedBook(null);
                      setBookModalState({ show: true, book: b });
                    }}
                  >
                    <i className="bi bi-pencil-square me-1"></i> Edit Book
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={selectedBook.available_copies === 0}
                    onClick={() => handleBorrowBook(selectedBook.id)}
                  >
                    <i className="bi bi-bookmark-plus me-1"></i>
                    {selectedBook.available_copies > 0 ? 'Borrow / Issue Book (14 Days)' : 'Out of Stock'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
