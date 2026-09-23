import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function BookFormModal({ book, categories, onClose, onSave }) {
  const isEdit = Boolean(book && book.id);

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    publisher: '',
    published_date: '',
    total_copies: 1,
    available_copies: 1,
    shelf_location: '',
    description: '',
  });
  const [coverFile, setCoverFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        isbn: book.isbn || '',
        category: book.category || '',
        publisher: book.publisher || '',
        published_date: book.published_date || '',
        total_copies: book.total_copies ?? 1,
        available_copies: book.available_copies ?? 1,
        shelf_location: book.shelf_location || '',
        description: book.description || '',
      });
    }
  }, [book]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (parseInt(value, 10) || 0) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend validation
    if (formData.available_copies > formData.total_copies) {
      setError('Available copies cannot be greater than Total Copies.');
      return;
    }
    if (formData.total_copies < 1) {
      setError('Total copies must be at least 1.');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
          data.append(key, formData[key]);
        }
      });
      if (coverFile) {
        data.append('cover_image', coverFile);
      }

      let res;
      if (isEdit) {
        res = await api.patch(`/books/${book.id}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/books/', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (onSave) {
        onSave(res.data, isEdit ? 'updated' : 'created');
      }
      onClose();
    } catch (err) {
      const errData = err.response?.data;
      if (errData && typeof errData === 'object') {
        const firstKey = Object.keys(errData)[0];
        setError(`${firstKey}: ${Array.isArray(errData[firstKey]) ? errData[firstKey][0] : errData[firstKey]}`);
      } else {
        setError('Failed to save book record. Please verify fields.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal show fade d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-dark text-white">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <i className={`bi ${isEdit ? 'bi-pencil-square text-warning' : 'bi-plus-circle-fill text-primary'}`}></i>
              {isEdit ? `Edit Book: ${book.title}` : 'Add New Book to Collection'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

              <div className="row g-3">
                <div className="col-md-8">
                  <label className="form-label small fw-bold">Book Title *</label>
                  <input
                    type="text"
                    name="title"
                    className="form-control"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Introduction to Algorithms"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-bold">ISBN (10 or 13 digits) *</label>
                  <input
                    type="text"
                    name="isbn"
                    className="form-control"
                    required
                    value={formData.isbn}
                    onChange={handleChange}
                    placeholder="e.g. 9780262033848"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold">Author(s) *</label>
                  <input
                    type="text"
                    name="author"
                    className="form-control"
                    required
                    value={formData.author}
                    onChange={handleChange}
                    placeholder="e.g. Thomas H. Cormen"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold">Category / Genre *</label>
                  <select
                    name="category"
                    className="form-select"
                    required
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-bold">Publisher *</label>
                  <input
                    type="text"
                    name="publisher"
                    className="form-control"
                    required
                    value={formData.publisher}
                    onChange={handleChange}
                    placeholder="e.g. MIT Press"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-bold">Published Date *</label>
                  <input
                    type="date"
                    name="published_date"
                    className="form-control"
                    required
                    value={formData.published_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-bold">Shelf Location *</label>
                  <input
                    type="text"
                    name="shelf_location"
                    className="form-control"
                    required
                    placeholder="e.g. CS-B2-04"
                    value={formData.shelf_location}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label small fw-bold">Total Copies *</label>
                  <input
                    type="number"
                    name="total_copies"
                    min="1"
                    className="form-control"
                    required
                    value={formData.total_copies}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setFormData((prev) => ({
                        ...prev,
                        total_copies: val,
                        available_copies: isEdit ? Math.min(prev.available_copies, val) : val,
                      }));
                    }}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label small fw-bold">Available in Stock *</label>
                  <input
                    type="number"
                    name="available_copies"
                    min="0"
                    max={formData.total_copies}
                    className="form-control"
                    required
                    value={formData.available_copies}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label small fw-bold">Cover Image (Optional)</label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files[0])}
                  />
                  {isEdit && book.cover_image_url && (
                    <small className="text-muted d-block mt-1">
                      Current cover image is active. Choose a file only to replace it.
                    </small>
                  )}
                </div>

                <div className="col-12">
                  <label className="form-label small fw-bold">Book Synopsis / Description</label>
                  <textarea
                    name="description"
                    className="form-control"
                    rows="3"
                    placeholder="Provide a short synopsis or overview of this volume..."
                    value={formData.description}
                    onChange={handleChange}
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="modal-footer bg-light">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Saving...
                  </>
                ) : isEdit ? (
                  'Save Changes'
                ) : (
                  'Add Book to Library'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
