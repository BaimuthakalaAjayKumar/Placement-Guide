import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import './PhysicalLibraryManager.css';

const PhysicalLibraryManager = () => {
  const { user, token } = useAuth();

  // Navigation tab: 'catalog' | 'circulation' | 'transactions' | 'reservations' | 'config'
  const [activeTab, setActiveTab] = useState('catalog');

  // Loading & notification states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);

  // Overview KPIs
  const [summaryData, setSummaryData] = useState({
    totalTitles: 0,
    totalCopies: 0,
    availableCopies: 0,
    issuedCopies: 0,
    overdueCount: 0,
    activeReservationsCount: 0,
    totalFinesCollected: 0
  });

  // Catalog state
  const [books, setBooks] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // Selected Book Detail & Copies Drawer
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedBookDetails, setSelectedBookDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Add Book Modal
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIsbn, setNewIsbn] = useState('');
  const [newAuthors, setNewAuthors] = useState('');
  const [newCategory, setNewCategory] = useState('Computer Science');
  const [newPublisher, setNewPublisher] = useState('');
  const [newShelfLocation, setNewShelfLocation] = useState('Main Stack');
  const [newCallNumber, setNewCallNumber] = useState('');
  const [newInitialCopies, setNewInitialCopies] = useState(2);
  const [newDescription, setNewDescription] = useState('');

  // Add Copies Modal
  const [showAddCopiesModal, setShowAddCopiesModal] = useState(false);
  const [addCopiesCount, setAddCopiesCount] = useState(1);
  const [addCopiesCondition, setAddCopiesCondition] = useState('GOOD');

  // Circulation Desk states
  const [issueAccession, setIssueAccession] = useState('');
  const [issueBorrower, setIssueBorrower] = useState('');
  const [returnAccession, setReturnAccession] = useState('');
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [renewAccession, setRenewAccession] = useState('');
  const [circulationResult, setCirculationResult] = useState(null);

  // Transactions Roster
  const [transactions, setTransactions] = useState([]);
  const [transactionStatusFilter, setTransactionStatusFilter] = useState('ALL');
  const [transactionSearch, setTransactionSearch] = useState('');

  // Reservations Roster
  const [reservations, setReservations] = useState([]);

  // Config State
  const [configData, setConfigData] = useState({
    maxBooksPerStudent: 3,
    maxBooksPerFaculty: 6,
    borrowPeriodDaysStudent: 14,
    borrowPeriodDaysFaculty: 30,
    maxRenewalCount: 2,
    dailyFineRate: 5,
    gracePeriodDays: 1
  });

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  const isAdminOrStaff = ['admin', 'super_admin', 'campus_admin', 'administrator', 'librarian'].includes(user?.role);

  // Mandatory Principal Fine Authorization & Settlement Workflow Modal
  const [settleModalTx, setSettleModalTx] = useState(null);
  const [settleAuthCode, setSettleAuthCode] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [settleModalError, setSettleModalError] = useState('');

  // =========================================================================
  // DATA FETCHING ROUTINES
  // =========================================================================

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/library/summary`, { headers: authHeaders });
      const data = await res.json();
      if (data.success && data.data) {
        setSummaryData(data.data);
      }
    } catch (_) {}
  }, [token]);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      let url = `${API_URL}/library/books?search=${encodeURIComponent(catalogSearch)}&category=${categoryFilter}&availability=${availabilityFilter}&limit=50`;
      const res = await fetch(url, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setBooks(data.data || []);
      } else {
        setErrorMsg(data.error || 'Failed to load library catalog.');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, catalogSearch, categoryFilter, availabilityFilter]);

  const fetchBookDetails = async (bookId) => {
    try {
      setLoadingDetails(true);
      const res = await fetch(`${API_URL}/library/books/${bookId}`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setSelectedBookDetails(data.data);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      let url = `${API_URL}/library/transactions?status=${transactionStatusFilter}&search=${encodeURIComponent(transactionSearch)}`;
      const res = await fetch(url, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data || []);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, transactionStatusFilter, transactionSearch]);

  const fetchReservations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/library/reservations?status=ALL`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setReservations(data.data || []);
      }
    } catch (_) {}
  }, [token]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/library/config`, { headers: authHeaders });
      const data = await res.json();
      if (data.success && data.data) {
        setConfigData(data.data);
      }
    } catch (_) {}
  }, [token]);

  useEffect(() => {
    fetchSummary();
    if (activeTab === 'catalog') fetchBooks();
    else if (activeTab === 'transactions') fetchTransactions();
    else if (activeTab === 'reservations') fetchReservations();
    else if (activeTab === 'config') fetchConfig();
  }, [activeTab, fetchSummary, fetchBooks, fetchTransactions, fetchReservations, fetchConfig]);

  // =========================================================================
  // ACTIONS: CATALOG & COPIES
  // =========================================================================

  const handleCreateBook = async (e) => {
    e.preventDefault();
    try {
      setActionProcessing(true);
      setErrorMsg('');
      setSuccessMsg('');

      const payload = {
        title: newTitle.trim(),
        isbn: newIsbn.trim(),
        authors: newAuthors,
        category: newCategory,
        publisher: newPublisher.trim(),
        shelfLocation: newShelfLocation.trim(),
        callNumber: newCallNumber.trim(),
        initialCopies: parseInt(newInitialCopies) || 1,
        description: newDescription.trim()
      };

      const res = await fetch(`${API_URL}/library/books`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to catalog book.');
      }

      setSuccessMsg(`Book "${newTitle}" cataloged with ${newInitialCopies} physical accession copies.`);
      setShowAddBookModal(false);
      resetAddBookForm();
      fetchSummary();
      fetchBooks();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  const resetAddBookForm = () => {
    setNewTitle('');
    setNewIsbn('');
    setNewAuthors('');
    setNewPublisher('');
    setNewShelfLocation('Main Stack');
    setNewCallNumber('');
    setNewInitialCopies(2);
    setNewDescription('');
  };

  const handleAddCopies = async (e) => {
    e.preventDefault();
    if (!selectedBook) return;
    try {
      setActionProcessing(true);
      setErrorMsg('');

      const res = await fetch(`${API_URL}/library/books/${selectedBook._id}/copies`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ count: addCopiesCount, condition: addCopiesCondition })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add copies.');
      }

      setSuccessMsg(data.message || 'Copies added successfully.');
      setShowAddCopiesModal(false);
      fetchBookDetails(selectedBook._id);
      fetchSummary();
      fetchBooks();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  // =========================================================================
  // ACTIONS: CIRCULATION DESK
  // =========================================================================

  const handleIssueBook = async (e) => {
    e.preventDefault();
    try {
      setActionProcessing(true);
      setErrorMsg('');
      setSuccessMsg('');
      setCirculationResult(null);

      const res = await fetch(`${API_URL}/library/issue`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          accessionNumber: issueAccession.trim(),
          borrowerIdentifier: issueBorrower.trim()
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Book issue failed.');
      }

      setSuccessMsg(data.message || 'Book issued successfully.');
      setCirculationResult({ type: 'ISSUE_SUCCESS', data: data.data });
      setIssueAccession('');
      setIssueBorrower('');
      fetchSummary();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleReturnBook = async (e) => {
    e.preventDefault();
    try {
      setActionProcessing(true);
      setErrorMsg('');
      setSuccessMsg('');
      setCirculationResult(null);

      const res = await fetch(`${API_URL}/library/return`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          accessionNumber: returnAccession.trim(),
          condition: returnCondition
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Book return failed.');
      }

      setSuccessMsg(data.message || 'Book returned successfully.');
      setCirculationResult({ type: 'RETURN_SUCCESS', data: data.data });
      setReturnAccession('');
      fetchSummary();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleRenewBook = async (e) => {
    e.preventDefault();
    try {
      setActionProcessing(true);
      setErrorMsg('');
      setSuccessMsg('');
      setCirculationResult(null);

      const res = await fetch(`${API_URL}/library/renew`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ accessionNumber: renewAccession.trim() })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Renewal failed.');
      }

      setSuccessMsg(data.message || 'Book renewed successfully.');
      setCirculationResult({ type: 'RENEW_SUCCESS', data: data.data });
      setRenewAccession('');
      fetchSummary();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleOpenSettleModal = (tx) => {
    setSettleModalTx(tx);
    setSettleAuthCode('');
    setSettleAmount(tx.fineAmount != null ? tx.fineAmount : 0);
    setSettleNotes('');
    setSettleModalError('');
  };

  const handleRecordSettlement = async (e) => {
    e.preventDefault();
    if (!settleModalTx) return;
    const cleanAuthCode = (settleAuthCode || '').trim().toUpperCase();
    if (!cleanAuthCode) {
      setSettleModalError('Principal authorization code is strictly mandatory.');
      return;
    }
    try {
      setActionProcessing(true);
      setSettleModalError('');
      const res = await fetch(`${API_URL}/library/transactions/${settleModalTx._id}/record-settlement`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          authorizationCode: cleanAuthCode,
          amountPaid: Number(settleAmount) || 0,
          notes: settleNotes.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Fine settlement failed.');
      }
      setSuccessMsg(data.message || `Fine settlement recorded successfully with authorization ${cleanAuthCode}.`);
      setSettleModalTx(null);
      fetchTransactions();
      fetchSummary();
    } catch (err) {
      setSettleModalError(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  const handlePayFine = async (transactionId) => {
    const tx = transactions.find((t) => t._id === transactionId);
    if (tx) {
      handleOpenSettleModal(tx);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setActionProcessing(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/library/config`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(configData)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Library policy parameters successfully updated.');
      } else {
        setErrorMsg(data.error || 'Failed to update configuration.');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  return (
    <div className="library-container animate-fade">
      {/* Header */}
      <div className="library-header">
        <div>
          <h2>
            <span>📚</span> Physical Library Management &amp; Circulation Desk
          </h2>
          <div className="library-sub">
            Physical book catalog, unique accession tracking, fast circulation desk, due date enforcement, and configurable fines.
          </div>
        </div>
        <div className="lib-header-actions">
          {isAdminOrStaff && (
            <button
              type="button"
              className="btn-lib-primary"
              onClick={() => setShowAddBookModal(true)}
            >
              <span>+</span> Catalog New Book
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="lib-kpi-grid">
        <div className="lib-kpi-card purple">
          <div className="lib-kpi-icon">📖</div>
          <div className="lib-kpi-info">
            <h3>{summaryData.totalTitles}</h3>
            <p>Catalog Titles</p>
          </div>
        </div>
        <div className="lib-kpi-card blue">
          <div className="lib-kpi-icon">📦</div>
          <div className="lib-kpi-info">
            <h3>{summaryData.totalCopies}</h3>
            <p>Physical Copies</p>
          </div>
        </div>
        <div className="lib-kpi-card green">
          <div className="lib-kpi-icon">✓</div>
          <div className="lib-kpi-info">
            <h3>{summaryData.availableCopies}</h3>
            <p>Available on Shelf</p>
          </div>
        </div>
        <div className="lib-kpi-card amber">
          <div className="lib-kpi-icon">🤝</div>
          <div className="lib-kpi-info">
            <h3>{summaryData.issuedCopies}</h3>
            <p>Currently Borrowed</p>
          </div>
        </div>
        <div className="lib-kpi-card red">
          <div className="lib-kpi-icon">⚠️</div>
          <div className="lib-kpi-info">
            <h3>{summaryData.overdueCount}</h3>
            <p>Overdue Books</p>
          </div>
        </div>
        <div className="lib-kpi-card purple">
          <div className="lib-kpi-icon">💰</div>
          <div className="lib-kpi-info">
            <h3>₹{summaryData.totalFinesCollected}</h3>
            <p>Fines Collected</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="error-banner animate-fade" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>⚠️ {errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>×</button>
        </div>
      )}
      {successMsg && (
        <div className="success-banner animate-fade" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>✓ {successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="lib-tabs-bar">
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => { setActiveTab('catalog'); setSelectedBook(null); }}
        >
          <span>📚</span> Book Catalog &amp; Accessions
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'circulation' ? 'active' : ''}`}
          onClick={() => setActiveTab('circulation')}
        >
          <span>🔄</span> Circulation Desk (Issue &amp; Return)
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <span>📜</span> Circulation History ({transactions.length})
        </button>
        <button
          type="button"
          className={`lib-tab-btn ${activeTab === 'reservations' ? 'active' : ''}`}
          onClick={() => setActiveTab('reservations')}
        >
          <span>📌</span> Active Reservations ({reservations.length})
        </button>
        {isAdminOrStaff && (
          <button
            type="button"
            className={`lib-tab-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <span>⚙️</span> Library Policies &amp; Fines
          </button>
        )}
      </div>

      {/* TAB 1: CATALOG VIEW */}
      {activeTab === 'catalog' && (
        <div>
          {/* Search & Filter Bar */}
          <div className="sd-filter-bar">
            <div className="sd-search-input-wrap">
              <span className="sd-search-icon">🔍</span>
              <input
                type="text"
                className="sd-search-input"
                placeholder="Search catalog by title, author, ISBN, call #, or shelf..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
            </div>
            <select
              className="sd-select-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Data Science & AI">Data Science & AI</option>
              <option value="Electronics & Comm">Electronics & Comm</option>
              <option value="Electrical & Power">Electrical & Power</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Civil">Civil</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Management & Soft Skills">Management & Soft Skills</option>
            </select>
            <select
              className="sd-select-filter"
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
            >
              <option value="all">All Copies</option>
              <option value="available">In Stock (Available)</option>
              <option value="unavailable">All Borrowed</option>
            </select>
          </div>

          {/* Book Cards Grid */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading physical catalog...</div>
          ) : books.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', background: '#1f2937', borderRadius: '12px' }}>
              No books match your search. Click "+ Catalog New Book" to add books to the physical inventory.
            </div>
          ) : (
            <div className="lib-books-grid">
              {books.map(b => (
                <div key={b._id} className="lib-book-card">
                  <div>
                    <div className="book-card-header">
                      <span className="book-category-tag">{b.category}</span>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {b.shelfLocation || 'Shelf: General'}
                      </span>
                    </div>
                    <div className="book-title">{b.title}</div>
                    <div className="book-author">By {b.authors?.join(', ') || 'Various'}</div>

                    <div className="book-meta-row">
                      <span>ISBN:</span>
                      <strong>{b.isbn || 'N/A'}</strong>
                    </div>
                    {b.callNumber && (
                      <div className="book-meta-row">
                        <span>Call #:</span>
                        <strong>{b.callNumber}</strong>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="book-copies-indicator">
                      <span>Physical Stock:</span>
                      <strong style={{ color: b.availableCopies > 0 ? '#34d399' : '#f87171' }}>
                        {b.availableCopies} / {b.totalCopies} Available
                      </strong>
                    </div>
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-lib-secondary"
                        style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}
                        onClick={() => { setSelectedBook(b); fetchBookDetails(b._id); }}
                      >
                        Inspect Copies
                      </button>
                      {isAdminOrStaff && (
                        <button
                          type="button"
                          className="btn-lib-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                          title="Add more physical copies"
                          onClick={() => { setSelectedBook(b); setShowAddCopiesModal(true); }}
                        >
                          + Copies
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* INSPECT COPIES MODAL */}
          {selectedBook && (
            <div className="sd-modal-backdrop" onClick={() => setSelectedBook(null)}>
              <div className="sd-modal-card" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
                <div className="sd-modal-header">
                  <h3><span>📖</span> {selectedBook.title} — Accession Inventory</h3>
                  <button type="button" className="sd-modal-close" onClick={() => setSelectedBook(null)}>×</button>
                </div>
                <div className="sd-modal-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', background: '#111827', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                    <div>
                      <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Shelf Location:</div>
                      <strong style={{ color: '#38bdf8' }}>{selectedBook.shelfLocation || 'Main Stack'}</strong>
                    </div>
                    <div>
                      <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Category:</div>
                      <strong style={{ color: '#a5b4fc' }}>{selectedBook.category}</strong>
                    </div>
                    <div>
                      <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Total Copies:</div>
                      <strong style={{ color: '#34d399' }}>{selectedBook.totalCopies}</strong>
                    </div>
                  </div>

                  {loadingDetails ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading accession copies...</div>
                  ) : (
                    <div>
                      <h4 style={{ margin: '0.5rem 0', color: '#e5e7eb', fontSize: '0.95rem' }}>Individual Physical Copies:</h4>
                      <table className="copies-list-table">
                        <thead>
                          <tr>
                            <th>Accession #</th>
                            <th>Status</th>
                            <th>Condition</th>
                            <th>Current Borrower</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBookDetails?.copies?.map(c => (
                            <tr key={c._id}>
                              <td><strong style={{ color: '#818cf8' }}>{c.accessionNumber}</strong></td>
                              <td>
                                <span className={`badge-status ${c.status.toLowerCase()}`}>
                                  {c.status}
                                </span>
                              </td>
                              <td>{c.condition}</td>
                              <td>
                                {c.currentBorrower ? (
                                  <div>
                                    <div style={{ fontWeight: 600 }}>{c.currentBorrower.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{c.currentBorrower.rollNumber || c.currentBorrower.email}</div>
                                  </div>
                                ) : (
                                  <span style={{ color: '#34d399' }}>On Shelf</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="sd-modal-footer">
                  <button type="button" className="btn-lib-secondary" onClick={() => setSelectedBook(null)}>Close</button>
                  {isAdminOrStaff && (
                    <button
                      type="button"
                      className="btn-lib-primary"
                      onClick={() => setShowAddCopiesModal(true)}
                    >
                      + Add More Copies
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CIRCULATION DESK */}
      {activeTab === 'circulation' && (
        <div>
          {/* Live Action Feedback */}
          {circulationResult && (
            <div style={{ background: '#111827', border: '1px solid #38bdf8', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>✓ Circulation Record Generated</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: '#9ca3af' }}>Transaction #: </span>
                  <strong>{circulationResult.data?.transaction?.transactionNumber || circulationResult.data?.transactionNumber}</strong>
                </div>
                <div>
                  <span style={{ color: '#9ca3af' }}>Accession #: </span>
                  <strong>{circulationResult.data?.transaction?.accessionNumber || circulationResult.data?.accessionNumber}</strong>
                </div>
                <div>
                  <span style={{ color: '#9ca3af' }}>Due Date: </span>
                  <strong>{circulationResult.data?.dueDate ? new Date(circulationResult.data.dueDate).toLocaleDateString() : 'N/A'}</strong>
                </div>
                {circulationResult.data?.fineAmount > 0 && (
                  <div>
                    <span style={{ color: '#f87171' }}>Fine Imposed: </span>
                    <strong style={{ color: '#f87171' }}>₹{circulationResult.data.fineAmount}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="circulation-panels-grid">
            {/* Quick Issue Card */}
            <div className="circulation-action-card">
              <h3><span>📤</span> Fast Issue Book</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
                Scan or enter the book copy accession code and borrower roll number.
              </p>
              <form onSubmit={handleIssueBook}>
                <div className="form-group">
                  <label>Accession Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ACC-GRIET-2026-XXXX"
                    value={issueAccession}
                    onChange={(e) => setIssueAccession(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Borrower Roll Number or Email *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 23241A12... or email"
                    value={issueBorrower}
                    onChange={(e) => setIssueBorrower(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-lib-primary" style={{ width: '100%' }} disabled={actionProcessing}>
                  {actionProcessing ? 'Processing Issue...' : 'Confirm Book Issue'}
                </button>
              </form>
            </div>

            {/* Quick Return Card */}
            <div className="circulation-action-card">
              <h3><span>📥</span> Fast Return Book</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
                Returns physical copy to inventory. Auto-calculates overdue fines if returned past grace period.
              </p>
              <form onSubmit={handleReturnBook}>
                <div className="form-group">
                  <label>Accession Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ACC-GRIET-2026-XXXX"
                    value={returnAccession}
                    onChange={(e) => setReturnAccession(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Return Condition</label>
                  <select
                    className="form-select"
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                  >
                    <option value="EXCELLENT">Excellent Condition</option>
                    <option value="GOOD">Good Condition</option>
                    <option value="FAIR">Fair (Normal Wear)</option>
                    <option value="DAMAGED">Damaged (Requires Repair)</option>
                  </select>
                </div>
                <button type="submit" className="btn-lib-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)' }} disabled={actionProcessing}>
                  {actionProcessing ? 'Processing Return...' : 'Accept Return & Calculate Fine'}
                </button>
              </form>
            </div>

            {/* Quick Renewal Card */}
            <div className="circulation-action-card">
              <h3><span>🔄</span> Fast Renewal</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
                Extends borrowing window by configured loan period (up to {configData.maxRenewalCount} times).
              </p>
              <form onSubmit={handleRenewBook}>
                <div className="form-group">
                  <label>Accession Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ACC-GRIET-2026-XXXX"
                    value={renewAccession}
                    onChange={(e) => setRenewAccession(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <button type="submit" className="btn-lib-secondary" style={{ width: '100%', marginTop: '1.8rem' }} disabled={actionProcessing}>
                  {actionProcessing ? 'Renewing...' : 'Extend Due Date'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTIONS ROSTER */}
      {activeTab === 'transactions' && (
        <div>
          <div className="sd-filter-bar">
            <div className="sd-search-input-wrap">
              <span className="sd-search-icon">🔍</span>
              <input
                type="text"
                className="sd-search-input"
                placeholder="Search by borrower name, roll number, or accession #..."
                value={transactionSearch}
                onChange={(e) => setTransactionSearch(e.target.value)}
              />
            </div>
            <select
              className="sd-select-filter"
              value={transactionStatusFilter}
              onChange={(e) => setTransactionStatusFilter(e.target.value)}
            >
              <option value="ALL">All Transactions</option>
              <option value="ISSUED">Currently Issued</option>
              <option value="OVERDUE">Overdue Only</option>
              <option value="RETURNED">Returned</option>
            </select>
          </div>

          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Trans #</th>
                  <th>Accession #</th>
                  <th>Book Title</th>
                  <th>Borrower</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Fine</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>Loading transactions...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No circulation transactions found.</td></tr>
                ) : (
                  transactions.map(tx => {
                    const isOverdue = tx.status === 'ISSUED' && new Date(tx.dueDate) < new Date();
                    return (
                      <tr key={tx._id}>
                        <td><strong style={{ color: '#38bdf8' }}>{tx.transactionNumber}</strong></td>
                        <td><strong style={{ color: '#818cf8' }}>{tx.accessionNumber}</strong></td>
                        <td style={{ fontWeight: 600 }}>{tx.book?.title || 'Unknown Title'}</td>
                        <td>
                          <div>{tx.borrowerName}</div>
                          <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{tx.borrowerRoll}</div>
                        </td>
                        <td>{new Date(tx.issueDate).toLocaleDateString()}</td>
                        <td>
                          <span style={{ color: isOverdue ? '#f87171' : '#fff', fontWeight: isOverdue ? 700 : 400 }}>
                            {new Date(tx.dueDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-status ${isOverdue ? 'rejected' : tx.status.toLowerCase()}`}>
                            {isOverdue ? 'OVERDUE' : tx.status}
                          </span>
                        </td>
                        <td>
                          {tx.fineAmount > 0 ? (
                            <div>
                              <strong style={{ color: tx.finePaid ? '#34d399' : '#f87171' }}>₹{tx.fineAmount}</strong>
                              <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{tx.finePaid ? 'Paid' : 'Unpaid'}</div>
                            </div>
                          ) : '₹0'}
                        </td>
                        <td>
                          {tx.fineAmount > 0 && !tx.finePaid && isAdminOrStaff && (
                            <button
                              type="button"
                              className="btn-action-sm"
                              style={{ background: '#10b981', color: '#fff' }}
                              onClick={() => handleOpenSettleModal(tx)}
                            >
                              Settle Fine
                            </button>
                          )}
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

      {/* TAB 4: RESERVATIONS */}
      {activeTab === 'reservations' && (
        <div>
          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Res #</th>
                  <th>Book Title</th>
                  <th>Reserved By</th>
                  <th>Reserved At</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reservations.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No book reservations placed.</td></tr>
                ) : (
                  reservations.map(r => (
                    <tr key={r._id}>
                      <td><strong style={{ color: '#818cf8' }}>{r.reservationNumber}</strong></td>
                      <td style={{ fontWeight: 600 }}>{r.book?.title}</td>
                      <td>
                        <div>{r.user?.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{r.user?.rollNumber || r.user?.email}</div>
                      </td>
                      <td>{new Date(r.reservedAt).toLocaleDateString()}</td>
                      <td>{new Date(r.expiryDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge-status ${r.status.toLowerCase()}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: POLICIES & FINES CONFIG */}
      {activeTab === 'config' && isAdminOrStaff && (
        <div style={{ maxWidth: '640px', background: '#1f2937', padding: '1.5rem', borderRadius: '12px', border: '1px solid #374151' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#fff' }}>⚙️ Institutional Library Policies</h3>
          <form onSubmit={handleSaveConfig}>
            <div className="form-group">
              <label>Daily Overdue Fine Rate (₹ per day) *</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={configData.dailyFineRate}
                onChange={(e) => setConfigData({ ...configData, dailyFineRate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Overdue Grace Period (Days)</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={configData.gracePeriodDays}
                onChange={(e) => setConfigData({ ...configData, gracePeriodDays: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Student Max Books Limit</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={configData.maxBooksPerStudent}
                  onChange={(e) => setConfigData({ ...configData, maxBooksPerStudent: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Student Loan Period (Days)</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={configData.borrowPeriodDaysStudent}
                  onChange={(e) => setConfigData({ ...configData, borrowPeriodDaysStudent: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Faculty Max Books Limit</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={configData.maxBooksPerFaculty}
                  onChange={(e) => setConfigData({ ...configData, maxBooksPerFaculty: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Faculty Loan Period (Days)</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={configData.borrowPeriodDaysFaculty}
                  onChange={(e) => setConfigData({ ...configData, borrowPeriodDaysFaculty: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Max Consecutive Renewals Permitted</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={configData.maxRenewalCount}
                onChange={(e) => setConfigData({ ...configData, maxRenewalCount: e.target.value })}
              />
            </div>
            <button type="submit" className="btn-lib-primary" style={{ marginTop: '0.5rem' }} disabled={actionProcessing}>
              {actionProcessing ? 'Saving...' : 'Save Policy Parameters'}
            </button>
          </form>
        </div>
      )}

      {/* MODAL: ADD NEW BOOK */}
      {showAddBookModal && (
        <div className="sd-modal-backdrop" onClick={() => setShowAddBookModal(false)}>
          <div className="sd-modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-header">
              <h3><span>📖</span> Catalog New Physical Book</h3>
              <button type="button" className="sd-modal-close" onClick={() => setShowAddBookModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateBook}>
              <div className="sd-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label>Book Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Introduction to Algorithms (CLRS)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Authors (comma-separated) *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Cormen, Leiserson, Rivest, Stein"
                      value={newAuthors}
                      onChange={(e) => setNewAuthors(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      className="form-select"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Data Science & AI">Data Science & AI</option>
                      <option value="Electronics & Comm">Electronics & Comm</option>
                      <option value="Electrical & Power">Electrical & Power</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Civil">Civil</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Management & Soft Skills">Management & Soft Skills</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>ISBN</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 978-0262033848"
                      value={newIsbn}
                      onChange={(e) => setNewIsbn(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Publisher</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. MIT Press"
                      value={newPublisher}
                      onChange={(e) => setNewPublisher(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Shelf Location</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Bay 4, Rack B"
                      value={newShelfLocation}
                      onChange={(e) => setNewShelfLocation(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Call / Dewey #</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 005.1 COR"
                      value={newCallNumber}
                      onChange={(e) => setNewCallNumber(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Initial Copies</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={newInitialCopies}
                      onChange={(e) => setNewInitialCopies(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Catalog Description / Synopsis</label>
                  <textarea
                    className="form-textarea"
                    rows="2"
                    placeholder="Brief description of textbook and curriculum alignment..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="sd-modal-footer">
                <button type="button" className="btn-lib-secondary" onClick={() => setShowAddBookModal(false)}>Cancel</button>
                <button type="submit" className="btn-lib-primary" disabled={actionProcessing}>
                  {actionProcessing ? 'Cataloging...' : 'Catalog Book & Generate Accessions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD COPIES TO EXISTING BOOK */}
      {showAddCopiesModal && selectedBook && (
        <div className="sd-modal-backdrop" onClick={() => setShowAddCopiesModal(false)}>
          <div className="sd-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-header">
              <h3><span>➕</span> Add Copies — {selectedBook.title}</h3>
              <button type="button" className="sd-modal-close" onClick={() => setShowAddCopiesModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddCopies}>
              <div className="sd-modal-body">
                <div className="form-group">
                  <label>Number of Physical Copies to Add *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className="form-input"
                    value={addCopiesCount}
                    onChange={(e) => setAddCopiesCount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Initial Physical Condition</label>
                  <select
                    className="form-select"
                    value={addCopiesCondition}
                    onChange={(e) => setAddCopiesCondition(e.target.value)}
                  >
                    <option value="EXCELLENT">Excellent (Brand New)</option>
                    <option value="GOOD">Good Condition</option>
                    <option value="FAIR">Fair Condition</option>
                  </select>
                </div>
              </div>
              <div className="sd-modal-footer">
                <button type="button" className="btn-lib-secondary" onClick={() => setShowAddCopiesModal(false)}>Cancel</button>
                <button type="submit" className="btn-lib-primary" disabled={actionProcessing}>
                  {actionProcessing ? 'Generating...' : 'Add Copies to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: RECORD FINE SETTLEMENT WITH PRINCIPAL AUTHORIZATION CODE */}
      {settleModalTx && (
        <div className="sd-modal-backdrop" onClick={() => setSettleModalTx(null)}>
          <div className="sd-modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-header">
              <h3><span>💳</span> Record Fine Settlement</h3>
              <button type="button" className="sd-modal-close" onClick={() => setSettleModalTx(null)}>×</button>
            </div>
            <form onSubmit={handleRecordSettlement}>
              <div className="sd-modal-body">
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.82rem',
                  color: '#cbd5e1',
                  lineHeight: '1.4'
                }}>
                  <strong style={{ color: '#818cf8', display: 'block', marginBottom: '0.25rem' }}>
                    🛡️ Institutional Governance Requirement
                  </strong>
                  Fine settlement strictly requires a valid, unexpired authorization token issued by the Principal or authorized delegate (e.g. <code>AUTH-FINE-YYYYMMDD-XXXX</code>). Circulation staff cannot self-authorize fines.
                </div>

                <div style={{
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Transaction #: </span>
                      <strong style={{ color: '#38bdf8' }}>{settleModalTx.transactionNumber}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Accession #: </span>
                      <strong style={{ color: '#818cf8' }}>{settleModalTx.accessionNumber}</strong>
                    </div>
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ color: '#9ca3af' }}>Book Title: </span>
                    <strong style={{ color: '#f3f4f6' }}>{settleModalTx.book?.title || 'Unknown Title'}</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Borrower: </span>
                      <strong>{settleModalTx.borrowerName} ({settleModalTx.borrowerRoll})</strong>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Outstanding Fine: </span>
                      <strong style={{ color: '#f87171' }}>₹{settleModalTx.fineAmount}</strong>
                    </div>
                  </div>
                </div>

                {settleModalError && (
                  <div className="error-banner animate-fade" style={{ marginBottom: '1rem', padding: '0.6rem 0.85rem', fontSize: '0.85rem' }}>
                    ⚠️ {settleModalError}
                  </div>
                )}

                <div className="form-group">
                  <label>Principal Authorization Code *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. AUTH-FINE-20261014-A1B2"
                    value={settleAuthCode}
                    onChange={(e) => setSettleAuthCode(e.target.value.toUpperCase())}
                    style={{ fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase' }}
                    required
                    autoFocus
                  />
                  <small style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Code provided by Principal/Dean office upon formal approval.
                  </small>
                </div>

                <div className="form-group">
                  <label>Settlement Amount (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Settlement Remarks / Receipt Ref (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Paid in cash at Central Library Circulation Desk"
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="sd-modal-footer">
                <button type="button" className="btn-lib-secondary" onClick={() => setSettleModalTx(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-lib-primary" disabled={actionProcessing}>
                  {actionProcessing ? 'Validating Token & Recording...' : 'Confirm & Record Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysicalLibraryManager;
