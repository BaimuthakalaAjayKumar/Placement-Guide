const mongoose = require('mongoose');
const crypto = require('crypto');
const Book = require('../models/Book');
const BookCopy = require('../models/BookCopy');
const LibraryTransaction = require('../models/LibraryTransaction');
const LibraryReservation = require('../models/LibraryReservation');
const LibraryConfig = require('../models/LibraryConfig');
const User = require('../models/User');
const Campus = require('../models/Campus');
const FineAuthorization = require('../models/FineAuthorization');
const PrincipalDelegation = require('../models/PrincipalDelegation');
const { logAuditEvent } = require('../utils/auditLogger');
const { isSuperAdmin, isCampusScopedAdmin } = require('../utils/scopeFilter');

// Helper to determine campus id
const getTargetCampusId = (req) => {
  if (isSuperAdmin(req.user) && req.query.campusId) {
    return req.query.campusId;
  }
  return req.user.campusId || req.user.campus?._id || req.user.campus || null;
};

// Helper to get or create library config
const getOrCreateConfig = async (campusId) => {
  if (!campusId) {
    return {
      maxBooksPerStudent: 3,
      maxBooksPerFaculty: 6,
      borrowPeriodDaysStudent: 14,
      borrowPeriodDaysFaculty: 30,
      maxRenewalCount: 2,
      dailyFineRate: 5,
      gracePeriodDays: 1
    };
  }
  let config = await LibraryConfig.findOne({ campusId });
  if (!config) {
    config = await LibraryConfig.create({
      campusId,
      maxBooksPerStudent: 3,
      maxBooksPerFaculty: 6,
      borrowPeriodDaysStudent: 14,
      borrowPeriodDaysFaculty: 30,
      maxRenewalCount: 2,
      dailyFineRate: 5,
      gracePeriodDays: 1
    });
  }
  return config;
};

// ============================================================
// 1. OVERVIEW KPIS
// ============================================================
exports.getLibrarySummary = async (req, res) => {
  try {
    const campusId = getTargetCampusId(req);
    const filter = campusId ? { campusId } : {};

    const [
      totalTitles,
      totalCopies,
      availableCopies,
      issuedCopies,
      overdueCount,
      activeReservationsCount,
      finesResult
    ] = await Promise.all([
      Book.countDocuments({ ...filter, isActive: true }),
      BookCopy.countDocuments(filter),
      BookCopy.countDocuments({ ...filter, status: 'AVAILABLE' }),
      BookCopy.countDocuments({ ...filter, status: 'ISSUED' }),
      LibraryTransaction.countDocuments({
        ...filter,
        status: 'ISSUED',
        dueDate: { $lt: new Date() }
      }),
      LibraryReservation.countDocuments({
        ...filter,
        status: { $in: ['PENDING', 'NOTIFIED'] }
      }),
      LibraryTransaction.aggregate([
        { $match: { ...filter, finePaid: true, fineAmount: { $gt: 0 } } },
        { $group: { _id: null, totalCollected: { $sum: '$fineAmount' } } }
      ])
    ]);

    const totalFinesCollected = finesResult.length > 0 ? finesResult[0].totalCollected : 0;

    res.status(200).json({
      success: true,
      data: {
        totalTitles,
        totalCopies,
        availableCopies,
        issuedCopies,
        overdueCount,
        activeReservationsCount,
        totalFinesCollected
      }
    });
  } catch (err) {
    console.error('Error in getLibrarySummary:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// 2. BOOK CATALOG & SEARCH
// ============================================================
exports.getBooks = async (req, res) => {
  try {
    const campusId = getTargetCampusId(req);
    const filter = { isActive: true };
    if (campusId) filter.campusId = campusId;

    const { search, category, availability, page = 1, limit = 20 } = req.query;

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      filter.$or = [
        { title: regex },
        { isbn: regex },
        { authors: regex },
        { callNumber: regex },
        { shelfLocation: regex }
      ];
    }

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (availability === 'available') {
      filter.availableCopies = { $gt: 0 };
    } else if (availability === 'unavailable') {
      filter.availableCopies = 0;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Book.countDocuments(filter);
    const books = await Book.find(filter)
      .populate('campusId', 'name code')
      .sort({ title: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: books
    });
  } catch (err) {
    console.error('Error in getBooks:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid book ID' });
    }

    const book = await Book.findById(id).populate('campusId', 'name code').lean();
    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }

    const copies = await BookCopy.find({ book: id })
      .populate('currentBorrower', 'name rollNumber email role')
      .populate('currentTransaction', 'transactionNumber dueDate issueDate')
      .sort({ accessionNumber: 1 })
      .lean();

    const activeReservations = await LibraryReservation.find({
      book: id,
      status: { $in: ['PENDING', 'NOTIFIED'] }
    })
      .populate('user', 'name rollNumber email role')
      .sort({ reservedAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        ...book,
        copies,
        activeReservations
      }
    });
  } catch (err) {
    console.error('Error in getBookById:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// 3. CREATE & MANAGE BOOKS & ACCESSIONS
// ============================================================
exports.createBook = async (req, res) => {
  try {
    const campusId = getTargetCampusId(req);
    if (!campusId) {
      return res.status(400).json({ success: false, error: 'Campus assignment required to add catalog books.' });
    }

    const {
      title,
      isbn,
      authors,
      category,
      publisher,
      edition,
      publicationYear,
      shelfLocation,
      callNumber,
      description,
      initialCopies = 1
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Book title is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, error: 'Book category is required.' });
    }

    const authorList = Array.isArray(authors)
      ? authors
      : (authors || '').split(',').map(a => a.trim()).filter(Boolean);

    const copiesCount = Math.max(1, parseInt(initialCopies) || 1);

    const book = await Book.create({
      title: title.trim(),
      isbn: (isbn || '').trim(),
      authors: authorList,
      category: category.trim(),
      publisher: (publisher || '').trim(),
      edition: (edition || '').trim(),
      publicationYear: publicationYear ? parseInt(publicationYear) : null,
      shelfLocation: (shelfLocation || 'Main Stack').trim(),
      callNumber: (callNumber || '').trim(),
      description: (description || '').trim(),
      campusId,
      totalCopies: copiesCount,
      availableCopies: copiesCount
    });

    const campusDoc = await Campus.findById(campusId);
    const campusCode = campusDoc?.code || 'GRIET';
    const year = new Date().getFullYear();

    // Create individual BookCopy records with sequential unique accession numbers
    const copies = [];
    for (let i = 1; i <= copiesCount; i++) {
      const randHex = crypto.randomBytes(3).toString('hex').toUpperCase();
      const accessionNumber = `ACC-${campusCode}-${year}-${randHex}`;
      copies.push({
        accessionNumber,
        book: book._id,
        campusId,
        status: 'AVAILABLE',
        condition: 'GOOD'
      });
    }

    await BookCopy.insertMany(copies);

    await logAuditEvent({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      campusId,
      action: 'BOOK_CREATED',
      category: 'Library',
      description: `Added "${book.title}" to physical catalog with ${copiesCount} physical copies`,
      details: { bookId: book._id, title: book.title, copiesCount }
    });

    res.status(201).json({
      success: true,
      message: `Book "${book.title}" cataloged with ${copiesCount} accession copies.`,
      data: book
    });
  } catch (err) {
    console.error('Error in createBook:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.addBookCopies = async (req, res) => {
  try {
    const { id } = req.params;
    const { count = 1, condition = 'GOOD' } = req.body;
    const addCount = Math.max(1, parseInt(count) || 1);

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }

    const campusDoc = await Campus.findById(book.campusId);
    const campusCode = campusDoc?.code || 'GRIET';
    const year = new Date().getFullYear();

    const newCopies = [];
    for (let i = 1; i <= addCount; i++) {
      const randHex = crypto.randomBytes(3).toString('hex').toUpperCase();
      const accessionNumber = `ACC-${campusCode}-${year}-${randHex}`;
      newCopies.push({
        accessionNumber,
        book: book._id,
        campusId: book.campusId,
        status: 'AVAILABLE',
        condition
      });
    }

    await BookCopy.insertMany(newCopies);

    book.totalCopies += addCount;
    book.availableCopies += addCount;
    await book.save();

    res.status(200).json({
      success: true,
      message: `Added ${addCount} physical copies to "${book.title}".`,
      data: { totalCopies: book.totalCopies, availableCopies: book.availableCopies }
    });
  } catch (err) {
    console.error('Error in addBookCopies:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates.totalCopies;
    delete updates.availableCopies;
    delete updates.campusId;

    const book = await Book.findByIdAndUpdate(id, updates, { new: true });
    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }

    res.status(200).json({ success: true, message: 'Book catalog updated.', data: book });
  } catch (err) {
    console.error('Error in updateBook:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateCopyStatus = async (req, res) => {
  try {
    const { copyId } = req.params;
    const { status, condition, notes } = req.body;

    const copy = await BookCopy.findById(copyId);
    if (!copy) {
      return res.status(404).json({ success: false, error: 'Book copy not found' });
    }

    const oldStatus = copy.status;
    if (status && status !== oldStatus) {
      copy.status = status;
      const book = await Book.findById(copy.book);
      if (book) {
        if (oldStatus === 'AVAILABLE' && status !== 'AVAILABLE') {
          book.availableCopies = Math.max(0, book.availableCopies - 1);
        } else if (oldStatus !== 'AVAILABLE' && status === 'AVAILABLE') {
          book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
        }
        await book.save();
      }
    }

    if (condition) copy.condition = condition;
    if (notes !== undefined) copy.notes = notes;
    await copy.save();

    res.status(200).json({ success: true, message: 'Accession copy status updated.', data: copy });
  } catch (err) {
    console.error('Error in updateCopyStatus:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// 4. CIRCULATION DESK: ISSUE, RETURN, RENEW & FINES
// ============================================================
exports.issueBook = async (req, res) => {
  try {
    const { accessionNumber, borrowerIdentifier, customDueDate, notes } = req.body;

    if (!accessionNumber || !borrowerIdentifier) {
      return res.status(400).json({
        success: false,
        error: 'Both Accession Number and Borrower Roll Number/Email are mandatory.'
      });
    }

    // 1. Find physical copy
    const copy = await BookCopy.findOne({
      accessionNumber: accessionNumber.trim().toUpperCase()
    }).populate('book');

    if (!copy) {
      return res.status(404).json({
        success: false,
        error: `Physical copy with Accession #${accessionNumber} does not exist.`
      });
    }

    if (copy.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        error: `Copy ${copy.accessionNumber} is currently marked as ${copy.status} and cannot be issued.`
      });
    }

    // 2. Lookup borrower
    const searchTarget = borrowerIdentifier.trim();
    const borrower = await User.findOne({
      $or: [
        { rollNumber: searchTarget },
        { email: searchTarget.toLowerCase() },
        { _id: mongoose.Types.ObjectId.isValid(searchTarget) ? searchTarget : null }
      ]
    });

    if (!borrower) {
      return res.status(404).json({
        success: false,
        error: `Borrower with identifier "${searchTarget}" not found in institutional directory.`
      });
    }

    // 3. Check borrower borrowing quota from LibraryConfig
    const config = await getOrCreateConfig(copy.campusId);
    const isFacultyBorrower = ['faculty', 'hod'].includes(borrower.role);
    const maxAllowed = isFacultyBorrower
      ? config.maxBooksPerFaculty
      : config.maxBooksPerStudent;

    const activeLoansCount = await LibraryTransaction.countDocuments({
      user: borrower._id,
      status: 'ISSUED'
    });

    if (activeLoansCount >= maxAllowed) {
      return res.status(400).json({
        success: false,
        error: `Quota exceeded: ${borrower.name} (${borrower.role}) already has ${activeLoansCount} books issued (maximum limit: ${maxAllowed}).`
      });
    }

    // Check overdue loans
    const hasOverdueLoans = await LibraryTransaction.findOne({
      user: borrower._id,
      status: 'ISSUED',
      dueDate: { $lt: new Date() }
    });

    if (hasOverdueLoans) {
      return res.status(400).json({
        success: false,
        error: `Borrower has overdue book (${hasOverdueLoans.accessionNumber}). Please return overdue items before new issues.`
      });
    }

    // 4. Calculate due date
    const loanDays = isFacultyBorrower
      ? config.borrowPeriodDaysFaculty
      : config.borrowPeriodDaysStudent;

    let dueDate = new Date();
    if (customDueDate) {
      dueDate = new Date(customDueDate);
    } else {
      dueDate.setDate(dueDate.getDate() + loanDays);
    }

    // 5. Create transaction
    const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const transactionNumber = `LTX-${dateSegment}-${randHex}`;

    const transaction = await LibraryTransaction.create({
      transactionNumber,
      book: copy.book._id,
      bookCopy: copy._id,
      accessionNumber: copy.accessionNumber,
      user: borrower._id,
      borrowerName: borrower.name,
      borrowerRoll: borrower.rollNumber || borrower.email,
      borrowerRole: borrower.role,
      campusId: copy.campusId,
      issueDate: new Date(),
      dueDate,
      status: 'ISSUED',
      issuedBy: req.user._id,
      notes: notes || ''
    });

    // 6. Update copy & book
    copy.status = 'ISSUED';
    copy.currentBorrower = borrower._id;
    copy.currentTransaction = transaction._id;
    await copy.save();

    await Book.findByIdAndUpdate(copy.book._id, {
      $inc: { availableCopies: -1 }
    });

    await logAuditEvent({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      campusId: copy.campusId,
      action: 'BOOK_ISSUED',
      category: 'Library',
      description: `Issued copy ${copy.accessionNumber} ("${copy.book?.title}") to ${borrower.name} (${borrower.rollNumber || borrower.email})`,
      details: { transactionNumber, accessionNumber: copy.accessionNumber, borrowerId: borrower._id, dueDate }
    });

    res.status(201).json({
      success: true,
      message: `Book copy ${copy.accessionNumber} successfully issued to ${borrower.name}.`,
      data: transaction
    });
  } catch (err) {
    console.error('Error in issueBook:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.returnBook = async (req, res) => {
  try {
    const { accessionNumber, transactionId, condition = 'GOOD', notes } = req.body;

    let transaction = null;
    if (transactionId) {
      transaction = await LibraryTransaction.findById(transactionId).populate('book');
    } else if (accessionNumber) {
      transaction = await LibraryTransaction.findOne({
        accessionNumber: accessionNumber.trim().toUpperCase(),
        status: 'ISSUED'
      }).populate('book');
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'No active issue record found for the specified accession number or transaction.'
      });
    }

    const now = new Date();
    const config = await getOrCreateConfig(transaction.campusId);

    // Calculate overdue fines
    let fineAmount = 0;
    const dueDate = new Date(transaction.dueDate);
    const graceDate = new Date(dueDate);
    graceDate.setDate(graceDate.getDate() + (config.gracePeriodDays || 0));

    if (now > graceDate) {
      const overdueMs = now.getTime() - dueDate.getTime();
      const overdueDays = Math.ceil(overdueMs / (1000 * 60 * 60 * 24));
      fineAmount = overdueDays * (config.dailyFineRate || 5);
    }

    transaction.status = 'RETURNED';
    transaction.returnDate = now;
    transaction.fineAmount = fineAmount;
    transaction.returnedTo = req.user._id;
    if (notes) transaction.notes = `${transaction.notes ? transaction.notes + ' | ' : ''}${notes}`;
    await transaction.save();

    // Update physical copy
    const copy = await BookCopy.findById(transaction.bookCopy);
    if (copy) {
      copy.status = 'AVAILABLE';
      copy.condition = condition;
      copy.currentBorrower = null;
      copy.currentTransaction = null;
      await copy.save();
    }

    // Increment available count
    await Book.findByIdAndUpdate(transaction.book._id || transaction.book, {
      $inc: { availableCopies: 1 }
    });

    // Notify any pending reservation
    const pendingReservation = await LibraryReservation.findOne({
      book: transaction.book._id || transaction.book,
      status: 'PENDING'
    }).sort({ reservedAt: 1 });

    if (pendingReservation) {
      pendingReservation.status = 'NOTIFIED';
      pendingReservation.allocatedCopy = copy?._id || null;
      await pendingReservation.save();
    }

    await logAuditEvent({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      campusId: transaction.campusId,
      action: 'BOOK_RETURNED',
      category: 'Library',
      description: `Returned copy ${transaction.accessionNumber} ("${transaction.book?.title}"). Fine: ₹${fineAmount}`,
      details: { transactionNumber: transaction.transactionNumber, fineAmount }
    });

    res.status(200).json({
      success: true,
      message: `Book copy ${transaction.accessionNumber} successfully returned.${fineAmount > 0 ? ` Overdue fine: ₹${fineAmount}.` : ''}`,
      data: {
        transaction,
        fineAmount,
        overdue: fineAmount > 0
      }
    });
  } catch (err) {
    console.error('Error in returnBook:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.renewBook = async (req, res) => {
  try {
    const { accessionNumber, transactionId } = req.body;

    let transaction = null;
    if (transactionId) {
      transaction = await LibraryTransaction.findById(transactionId);
    } else if (accessionNumber) {
      transaction = await LibraryTransaction.findOne({
        accessionNumber: accessionNumber.trim().toUpperCase(),
        status: 'ISSUED'
      });
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Active issue transaction not found.'
      });
    }

    const config = await getOrCreateConfig(transaction.campusId);

    if (transaction.renewalCount >= config.maxRenewalCount) {
      return res.status(400).json({
        success: false,
        error: `Maximum renewal limit reached (${config.maxRenewalCount} times). Please return the book.`
      });
    }

    // Disallow renewal if book has pending reservations by other students
    const pendingReservations = await LibraryReservation.countDocuments({
      book: transaction.book,
      status: { $in: ['PENDING', 'NOTIFIED'] }
    });

    if (pendingReservations > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot renew: other students have placed reservations on this title.'
      });
    }

    const loanDays = transaction.borrowerRole === 'faculty'
      ? config.borrowPeriodDaysFaculty
      : config.borrowPeriodDaysStudent;

    const newDueDate = new Date(transaction.dueDate);
    newDueDate.setDate(newDueDate.getDate() + loanDays);

    transaction.dueDate = newDueDate;
    transaction.renewalCount += 1;
    transaction.status = 'RENEWED';
    await transaction.save();

    res.status(200).json({
      success: true,
      message: `Book renewed until ${newDueDate.toLocaleDateString()} (Renewal #${transaction.renewalCount}).`,
      data: transaction
    });
  } catch (err) {
    console.error('Error in renewBook:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// 4b. MANDATORY PRINCIPAL FINE AUTHORIZATION & SETTLEMENT WORKFLOW
// ============================================================

/**
 * @desc    Authorize a fine settlement (Principal or active verified delegate only)
 * @route   POST /api/library/fines/:id/authorize
 * @access  Private (Principal, Super Admin, or Verified Active Principal Delegate)
 */
exports.authorizeFineSettlement = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      settlementType = 'FULL_PAYMENT',
      authorizedAmount,
      notes = ''
    } = req.body;

    const transaction = await LibraryTransaction.findById(id).populate('book', 'title').populate('user', 'name rollNumber');
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    if (transaction.finePaid) {
      return res.status(400).json({ success: false, error: 'Fine for this transaction has already been settled and paid.' });
    }

    const user = req.user;
    const userRole = user.role ? user.role.trim().toLowerCase() : '';
    let isAuthorized = false;
    let isDelegate = false;
    let activeDelegation = null;

    // Direct Campus Principal
    if (userRole === 'principal') {
      if (user.campusId && transaction.campusId.toString() !== user.campusId.toString()) {
        return res.status(403).json({
          success: false,
          code: 'CROSS_CAMPUS_FORBIDDEN',
          error: 'Multi-Campus Isolation: Principal can only authorize fines for their assigned campus.'
        });
      }
      isAuthorized = true;
    } else {
      // Check for an active, valid PrincipalDelegation for this campus and user.
      // Super Admin or other designated staff may authorize ONLY if explicitly designated under an active, audited delegation.
      const now = new Date();
      activeDelegation = await PrincipalDelegation.findOne({
        campusId: transaction.campusId,
        delegate: user._id,
        status: 'ACTIVE',
        startDate: { $lte: now },
        endDate: { $gte: now }
      });

      if (activeDelegation) {
        isAuthorized = true;
        isDelegate = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        code: 'PRINCIPAL_AUTHORIZATION_REQUIRED',
        error: 'Access Denied: Authorization is unavailable until a valid authorized approver is available. Only the Campus Principal or an explicitly designated, audited delegate under a valid delegation can authorize fine settlements.'
      });
    }

    const originalFine = transaction.fineAmount || 0;
    const finalAuthorizedAmount = (authorizedAmount !== undefined && authorizedAmount !== null)
      ? Number(authorizedAmount)
      : originalFine;

    if (finalAuthorizedAmount < 0) {
      return res.status(400).json({ success: false, error: 'Authorized settlement amount cannot be negative.' });
    }

    // Generate unguessable authorization code with 48-Hour TTL
    const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const authorizationCode = `AUTH-FINE-${dateKey}-${randHex}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const authorization = await FineAuthorization.create({
      transaction: transaction._id,
      campusId: transaction.campusId,
      borrower: transaction.user._id || transaction.user,
      originalFineAmount: originalFine,
      authorizedSettlementAmount: finalAuthorizedAmount,
      settlementType,
      authorizedBy: user._id,
      authorizedRole: isDelegate ? 'delegate' : userRole,
      isDelegated: isDelegate,
      delegationRef: activeDelegation?._id || null,
      authorizationCode,
      status: 'AUTHORIZED',
      expiresAt,
      notes: notes.trim()
    });

    await logAuditEvent({
      user: user._id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      campusId: transaction.campusId,
      action: 'FINE_SETTLEMENT_AUTHORIZED',
      category: 'Library',
      description: `Principal authorized ${settlementType} of ₹${finalAuthorizedAmount} (Original: ₹${originalFine}) for transaction ${transaction.transactionNumber}. Code: ${authorizationCode}`,
      details: {
        transactionId: transaction._id,
        authorizationCode,
        authorizedAmount: finalAuthorizedAmount,
        settlementType,
        isDelegated: isDelegate,
        expiresAt
      }
    });

    res.status(201).json({
      success: true,
      message: `Fine settlement successfully authorized. Authorization code valid for 48 hours.`,
      data: {
        authorizationId: authorization._id,
        authorizationCode: authorization.authorizationCode,
        authorizedSettlementAmount: authorization.authorizedSettlementAmount,
        settlementType: authorization.settlementType,
        expiresAt: authorization.expiresAt,
        isDelegated: authorization.isDelegated
      }
    });
  } catch (err) {
    console.error('Error in authorizeFineSettlement:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Record authorized fine settlement (Librarian presentation of Principal token)
 * @route   PUT /api/library/transactions/:id/record-settlement
 * @route   PUT /api/library/transactions/:id/pay-fine
 * @access  Private (Librarian, Administrator, Campus Admin, Super Admin)
 */
exports.recordSettlement = async (req, res) => {
  let session = null;
  let useTransaction = false;
  let consumedAuth = null;

  try {
    const { id } = req.params;
    const { authorizationCode, amountPaid, notes = '' } = req.body;

    if (!authorizationCode || typeof authorizationCode !== 'string' || !authorizationCode.trim()) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_PRINCIPAL_AUTHORIZATION',
        error: 'Principal authorization code is strictly mandatory for fine settlement recording.'
      });
    }

    const transaction = await LibraryTransaction.findById(id).populate('book', 'title').populate('user', 'name rollNumber');
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction record not found' });
    }

    if (transaction.finePaid) {
      return res.status(400).json({
        success: false,
        code: 'FINE_ALREADY_PAID',
        error: 'Fine for this transaction has already been settled and paid.'
      });
    }

    const cleanAuthCode = authorizationCode.trim().toUpperCase();
    const authRecord = await FineAuthorization.findOne({ authorizationCode: cleanAuthCode });

    if (!authRecord) {
      return res.status(404).json({
        success: false,
        code: 'INVALID_AUTHORIZATION_CODE',
        error: 'No fine authorization record found matching the provided code.'
      });
    }

    // 1. Binding check: Transaction binding
    if (authRecord.transaction.toString() !== transaction._id.toString()) {
      return res.status(400).json({
        success: false,
        code: 'TRANSACTION_MISMATCH',
        error: 'Authorization code is bound to a different library transaction.'
      });
    }

    // 2. Binding check: Borrower binding
    const borrowerId = transaction.user?._id ? transaction.user._id.toString() : transaction.user?.toString();
    const authBorrowerId = authRecord.borrower?._id
      ? authRecord.borrower._id.toString()
      : (authRecord.borrower ? authRecord.borrower.toString() : null);
    if (authBorrowerId && borrowerId && authBorrowerId !== borrowerId) {
      return res.status(400).json({
        success: false,
        code: 'BORROWER_MISMATCH',
        error: 'Authorization code is bound to a different borrower.'
      });
    }

    // 3. Binding check: Campus binding
    if (authRecord.campusId && transaction.campusId && authRecord.campusId.toString() !== transaction.campusId.toString()) {
      return res.status(400).json({
        success: false,
        code: 'CAMPUS_MISMATCH',
        error: 'Authorization code is bound to a different campus than the transaction.'
      });
    }

    if (req.user.campusId && authRecord.campusId.toString() !== req.user.campusId.toString() && !isSuperAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        code: 'CROSS_CAMPUS_FORBIDDEN',
        error: 'Multi-Campus Isolation: Cross-campus fine settlement recording forbidden.'
      });
    }

    // 4. Status check & Replay Prevention
    if (authRecord.status === 'CONSUMED') {
      return res.status(409).json({
        success: false,
        code: 'TOKEN_ALREADY_CONSUMED',
        error: 'This authorization code has already been consumed and cannot be reused (replay prevention).'
      });
    }

    if (authRecord.status !== 'AUTHORIZED') {
      return res.status(400).json({
        success: false,
        code: 'AUTHORIZATION_NOT_ACTIVE',
        error: `Authorization code status is '${authRecord.status}'. Only 'AUTHORIZED' tokens may be settled.`
      });
    }

    // 5. Expiry check (48 hours)
    if (new Date() > new Date(authRecord.expiresAt)) {
      return res.status(400).json({
        success: false,
        code: 'AUTHORIZATION_EXPIRED',
        error: 'Principal authorization has expired (48-hour limit exceeded). A new authorization must be requested.'
      });
    }

    // 6. Settlement amount / type validation
    if (amountPaid !== undefined && amountPaid !== null) {
      const parsedAmount = Number(amountPaid);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_SETTLEMENT_AMOUNT',
          error: 'Settlement amount must be a non-negative number.'
        });
      }
      if (authRecord.settlementType === 'FULL_WAIVER' && parsedAmount > 0) {
        return res.status(400).json({
          success: false,
          code: 'SETTLEMENT_AMOUNT_MISMATCH',
          error: 'Authorization is for a FULL_WAIVER; settlement amount collected must be 0.'
        });
      }
    }

    const settlementCollected = (amountPaid !== undefined && amountPaid !== null)
      ? Number(amountPaid)
      : authRecord.authorizedSettlementAmount;

    // Check if MongoDB transaction is supported on active connection
    const canAttemptTransaction = mongoose.connection && mongoose.connection.readyState === 1 && typeof mongoose.startSession === 'function';
    if (canAttemptTransaction) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      } catch (sessionErr) {
        if (session) {
          try {
            if (typeof session.inTransaction === 'function' && session.inTransaction()) {
              await session.abortTransaction();
            }
          } catch (_) {}
          try { await session.endSession(); } catch (_) {}
          session = null;
        }
        useTransaction = false;
      }
    }

    const now = new Date();
    const settlementNotes = notes
      ? `${transaction.notes ? transaction.notes + ' | ' : ''}Settlement [${authRecord.settlementType}] Auth: ${cleanAuthCode}. ${notes}`.trim()
      : (transaction.notes || '');

    let updatedTransaction = null;

    if (useTransaction) {
      try {
        // Atomic consumption lock preventing race conditions and concurrent double-spend
        consumedAuth = await FineAuthorization.findOneAndUpdate(
          {
            _id: authRecord._id,
            status: 'AUTHORIZED',
            expiresAt: { $gt: now }
          },
          {
            $set: {
              status: 'CONSUMED',
              consumedAt: now,
              consumedBy: req.user._id,
              amountCollected: settlementCollected
            }
          },
          { new: true, session }
        );

        if (!consumedAuth) {
          if (typeof session.inTransaction === 'function' && session.inTransaction()) {
            await session.abortTransaction();
          }
          await session.endSession();
          session = null;
          return res.status(409).json({
            success: false,
            code: 'CONCURRENT_SETTLEMENT_REJECTED',
            error: 'Authorization was consumed concurrently by another transaction or has expired.'
          });
        }

        updatedTransaction = await LibraryTransaction.findOneAndUpdate(
          {
            _id: transaction._id,
            finePaid: false
          },
          {
            $set: {
              finePaid: true,
              finePaidAt: now,
              principalAuthorizationId: consumedAuth._id,
              settlementType: consumedAuth.settlementType,
              settlementAmount: settlementCollected,
              settlementRecordedBy: req.user._id,
              settlementRecordedAt: now,
              notes: settlementNotes
            }
          },
          { new: true, session }
        );

        if (!updatedTransaction) {
          if (typeof session.inTransaction === 'function' && session.inTransaction()) {
            await session.abortTransaction();
          }
          await session.endSession();
          session = null;
          return res.status(409).json({
            success: false,
            code: 'TRANSACTION_ALREADY_SETTLED',
            error: 'Library transaction fine was settled concurrently.'
          });
        }

        await session.commitTransaction();
        await session.endSession();
        session = null;
      } catch (txErr) {
        if (session) {
          try {
            if (typeof session.inTransaction === 'function' && session.inTransaction()) {
              await session.abortTransaction();
            }
          } catch (_) {}
          try { await session.endSession(); } catch (_) {}
          session = null;
        }
        throw txErr;
      }
    } else {
      // Non-replica set / Standalone environment: Two-Phase Lease with Compensation Rollback
      consumedAuth = await FineAuthorization.findOneAndUpdate(
        {
          _id: authRecord._id,
          status: 'AUTHORIZED',
          expiresAt: { $gt: now }
        },
        {
          $set: {
            status: 'CONSUMED',
            consumedAt: now,
            consumedBy: req.user._id,
            amountCollected: settlementCollected
          }
        },
        { new: true }
      );

      if (!consumedAuth) {
        return res.status(409).json({
          success: false,
          code: 'CONCURRENT_SETTLEMENT_REJECTED',
          error: 'Authorization was consumed concurrently by another transaction or has expired.'
        });
      }

      try {
        updatedTransaction = await LibraryTransaction.findOneAndUpdate(
          {
            _id: transaction._id,
            finePaid: false
          },
          {
            $set: {
              finePaid: true,
              finePaidAt: now,
              principalAuthorizationId: consumedAuth._id,
              settlementType: consumedAuth.settlementType,
              settlementAmount: settlementCollected,
              settlementRecordedBy: req.user._id,
              settlementRecordedAt: now,
              notes: settlementNotes
            }
          },
          { new: true }
        );

        if (!updatedTransaction) {
          throw new Error('CONCURRENT_TRANSACTION_PAYMENT');
        }
      } catch (txnUpdateErr) {
        // CRITICAL COMPENSATION ROLLBACK: Revert authorization back to AUTHORIZED
        console.error('[FINE_SETTLEMENT_ROLLBACK] Settlement recording failed; executing compensation rollback:', txnUpdateErr.message);
        try {
          await FineAuthorization.updateOne(
            { _id: consumedAuth._id, status: 'CONSUMED' },
            {
              $set: {
                status: 'AUTHORIZED',
                consumedAt: null,
                consumedBy: null,
                amountCollected: 0
              }
            }
          );
        } catch (rollbackErr) {
          console.error('[FINE_SETTLEMENT_ROLLBACK_CRITICAL] Failed to execute compensation rollback:', rollbackErr);
        }

        if (txnUpdateErr.message === 'CONCURRENT_TRANSACTION_PAYMENT') {
          return res.status(409).json({
            success: false,
            code: 'TRANSACTION_ALREADY_SETTLED',
            error: 'Library transaction fine was settled concurrently. Authorization has been safely restored.'
          });
        }

        return res.status(500).json({
          success: false,
          code: 'SETTLEMENT_RECORDING_FAILED',
          error: `Failed to record fine settlement on transaction: ${txnUpdateErr.message}. Authorization has been safely restored to AUTHORIZED.`
        });
      }
    }

    await logAuditEvent({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      campusId: transaction.campusId,
      action: 'FINE_SETTLEMENT_RECORDED',
      category: 'Library',
      description: `Librarian ${req.user.name} recorded fine settlement of ₹${settlementCollected} (${consumedAuth.settlementType}) for copy ${transaction.accessionNumber}. Auth: ${cleanAuthCode}`,
      details: {
        transactionId: transaction._id,
        authorizationCode: cleanAuthCode,
        settlementType: consumedAuth.settlementType,
        originalFine: transaction.fineAmount,
        amountCollected: settlementCollected,
        authorizedBy: consumedAuth.authorizedBy,
        settlementRecordedBy: req.user._id
      }
    });

    res.status(200).json({
      success: true,
      message: `Fine settlement successfully recorded with verified Principal authorization.`,
      data: {
        transaction: updatedTransaction,
        authorization: consumedAuth
      }
    });
  } catch (err) {
    if (session) {
      try {
        if (typeof session.inTransaction === 'function' && session.inTransaction()) {
          await session.abortTransaction();
        }
      } catch (_) {}
      try { await session.endSession(); } catch (_) {}
    }
    if (consumedAuth && !useTransaction) {
      try {
        await FineAuthorization.updateOne(
          { _id: consumedAuth._id, status: 'CONSUMED' },
          {
            $set: {
              status: 'AUTHORIZED',
              consumedAt: null,
              consumedBy: null,
              amountCollected: 0
            }
          }
        );
      } catch (_) {}
    }
    console.error('Error in recordSettlement:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Aliased legacy handler enforcing the exact same mandatory authorization
exports.payFine = exports.recordSettlement;

/**
 * @desc    List fine authorizations for campus
 * @route   GET /api/library/fines/authorizations
 * @access  Private (Principal, Librarian, Campus Admin, Super Admin)
 */
exports.getFineAuthorizations = async (req, res) => {
  try {
    const campusId = getTargetCampusId(req);
    const query = {};
    if (campusId) query.campusId = campusId;
    if (req.query.status) query.status = req.query.status;
    if (req.query.transactionId) query.transaction = req.query.transactionId;

    const authorizations = await FineAuthorization.find(query)
      .populate('borrower', 'name rollNumber email')
      .populate('authorizedBy', 'name role email')
      .populate('transaction', 'transactionNumber accessionNumber fineAmount status')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      count: authorizations.length,
      data: authorizations
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Designate a formal Principal delegate during absence
 * @route   POST /api/library/delegations
 * @access  Private (Principal Only)
 */
exports.createPrincipalDelegation = async (req, res) => {
  try {
    const userRole = req.user.role ? req.user.role.trim().toLowerCase() : '';
    if (userRole !== 'principal' && !isSuperAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Only the Campus Principal can designate authorization delegates.'
      });
    }

    const { delegateId, purpose, startDate, endDate } = req.body;
    if (!delegateId || !purpose || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Delegate ID, purpose, start date, and end date are mandatory.'
      });
    }

    const delegateUser = await User.findById(delegateId);
    if (!delegateUser) {
      return res.status(404).json({ success: false, error: 'Delegate user record not found' });
    }

    // Separation of Duties: Delegate CANNOT be a Librarian
    if (delegateUser.role === 'librarian') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_DELEGATE_ROLE',
        error: 'Separation of Duties Violation: A Librarian cannot be designated as an authorizing Principal delegate.'
      });
    }

    const campusId = req.user.campusId || delegateUser.campusId;

    const delegation = await PrincipalDelegation.create({
      campusId,
      principal: req.user._id,
      delegate: delegateUser._id,
      delegateName: delegateUser.name,
      delegateRole: delegateUser.role,
      purpose: purpose.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'ACTIVE'
    });

    await logAuditEvent({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      campusId,
      action: 'PRINCIPAL_DELEGATION_CREATED',
      category: 'Administration',
      description: `Principal ${req.user.name} designated ${delegateUser.name} (${delegateUser.role}) as authorization delegate until ${new Date(endDate).toLocaleDateString()}`,
      details: { delegationId: delegation._id, delegateId: delegateUser._id, purpose }
    });

    res.status(201).json({
      success: true,
      message: 'Principal authorization delegation created successfully.',
      data: delegation
    });
  } catch (err) {
    console.error('Error in createPrincipalDelegation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get active Principal delegations for campus
 * @route   GET /api/library/delegations
 * @access  Private (Principal, Administrator, Campus Admin, Super Admin, Auditor)
 */
exports.getPrincipalDelegations = async (req, res) => {
  try {
    const campusId = getTargetCampusId(req);
    const query = {};
    if (campusId) query.campusId = campusId;

    const delegations = await PrincipalDelegation.find(query)
      .populate('principal', 'name email')
      .populate('delegate', 'name role email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: delegations.length,
      data: delegations
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Revoke a Principal delegation
 * @route   PUT /api/library/delegations/:id/revoke
 * @access  Private (Principal Only)
 */
exports.revokePrincipalDelegation = async (req, res) => {
  try {
    const userRole = req.user.role ? req.user.role.trim().toLowerCase() : '';
    if (userRole !== 'principal' && !isSuperAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Only the Campus Principal can revoke authorization delegations.'
      });
    }

    const { id } = req.params;
    const { reason = '' } = req.body;
    const delegation = await PrincipalDelegation.findById(id);
    if (!delegation) {
      return res.status(404).json({ success: false, error: 'Delegation record not found' });
    }

    delegation.status = 'REVOKED';
    delegation.revokedAt = new Date();
    delegation.revokedBy = req.user._id;
    delegation.revocationReason = reason.trim();
    await delegation.save();

    res.status(200).json({
      success: true,
      message: 'Principal delegation revoked successfully.',
      data: delegation
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// 5. RESERVATIONS
// ============================================================
exports.reserveBook = async (req, res) => {
  try {
    const { bookId } = req.body;
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }

    const existingReservation = await LibraryReservation.findOne({
      book: bookId,
      user: req.user._id,
      status: { $in: ['PENDING', 'NOTIFIED'] }
    });

    if (existingReservation) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active reservation for this book.'
      });
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    const randHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const reservationNumber = `RES-${new Date().getFullYear()}-${randHex}`;

    const reservation = await LibraryReservation.create({
      reservationNumber,
      book: book._id,
      user: req.user._id,
      campusId: book.campusId,
      expiryDate,
      status: 'PENDING'
    });

    res.status(201).json({
      success: true,
      message: `Reservation #${reservationNumber} confirmed. You will be notified once a copy becomes available.`,
      data: reservation
    });
  } catch (err) {
    console.error('Error in reserveBook:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await LibraryReservation.findById(id);
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    if (String(reservation.user) !== String(req.user._id) && !isCampusScopedAdmin(req.user)) {
      return res.status(403).json({ success: false, error: 'Unauthorized to cancel this reservation' });
    }

    reservation.status = 'CANCELLED';
    await reservation.save();

    res.status(200).json({ success: true, message: 'Reservation cancelled.' });
  } catch (err) {
    console.error('Error in cancelReservation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getReservations = async (req, res) => {
  try {
    const campusId = getTargetCampusId(req);
    const filter = campusId ? { campusId } : {};

    const { status = 'PENDING' } = req.query;
    if (status !== 'ALL') filter.status = status;

    const reservations = await LibraryReservation.find(filter)
      .populate('book', 'title authors callNumber')
      .populate('user', 'name rollNumber email role')
      .sort({ reservedAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: reservations });
  } catch (err) {
    console.error('Error in getReservations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// 6. CIRCULATION ROSTER & USER LOANS
// ============================================================
exports.getTransactions = async (req, res) => {
  try {
    const campusId = getTargetCampusId(req);
    const filter = {};
    if (campusId) filter.campusId = campusId;

    const { status, search, page = 1, limit = 25 } = req.query;

    if (status === 'ISSUED') {
      filter.status = { $in: ['ISSUED', 'RENEWED'] };
    } else if (status === 'OVERDUE') {
      filter.status = { $in: ['ISSUED', 'RENEWED'] };
      filter.dueDate = { $lt: new Date() };
    } else if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      filter.$or = [
        { borrowerName: regex },
        { borrowerRoll: regex },
        { accessionNumber: regex },
        { transactionNumber: regex }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await LibraryTransaction.countDocuments(filter);
    const transactions = await LibraryTransaction.find(filter)
      .populate('book', 'title authors category callNumber')
      .populate('user', 'name rollNumber email role')
      .populate('issuedBy', 'name role')
      .populate('returnedTo', 'name role')
      .sort({ issueDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      total,
      data: transactions
    });
  } catch (err) {
    console.error('Error in getTransactions:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getMyLoans = async (req, res) => {
  try {
    const loans = await LibraryTransaction.find({ user: req.user._id })
      .populate('book', 'title authors category callNumber shelfLocation')
      .sort({ issueDate: -1 })
      .lean();

    const reservations = await LibraryReservation.find({
      user: req.user._id,
      status: { $in: ['PENDING', 'NOTIFIED'] }
    })
      .populate('book', 'title authors callNumber')
      .sort({ reservedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        activeLoans: loans.filter(l => ['ISSUED', 'RENEWED'].includes(l.status)),
        pastHistory: loans.filter(l => l.status === 'RETURNED'),
        reservations
      }
    });
  } catch (err) {
    console.error('Error in getMyLoans:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================
// 7. CONFIGURATION
// ============================================================
exports.getLibraryConfig = async (req, res) => {
  try {
    const campusId = getTargetCampusId(req);
    const config = await getOrCreateConfig(campusId);
    res.status(200).json({ success: true, data: config });
  } catch (err) {
    console.error('Error in getLibraryConfig:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateLibraryConfig = async (req, res) => {
  try {
    const campusId = getTargetCampusId(req);
    if (!campusId) {
      return res.status(400).json({ success: false, error: 'Campus assignment required' });
    }

    const {
      maxBooksPerStudent,
      maxBooksPerFaculty,
      borrowPeriodDaysStudent,
      borrowPeriodDaysFaculty,
      maxRenewalCount,
      dailyFineRate,
      gracePeriodDays
    } = req.body;

    let config = await LibraryConfig.findOne({ campusId });
    if (!config) {
      config = new LibraryConfig({ campusId });
    }

    if (maxBooksPerStudent !== undefined) config.maxBooksPerStudent = Number(maxBooksPerStudent);
    if (maxBooksPerFaculty !== undefined) config.maxBooksPerFaculty = Number(maxBooksPerFaculty);
    if (borrowPeriodDaysStudent !== undefined) config.borrowPeriodDaysStudent = Number(borrowPeriodDaysStudent);
    if (borrowPeriodDaysFaculty !== undefined) config.borrowPeriodDaysFaculty = Number(borrowPeriodDaysFaculty);
    if (maxRenewalCount !== undefined) config.maxRenewalCount = Number(maxRenewalCount);
    if (dailyFineRate !== undefined) config.dailyFineRate = Number(dailyFineRate);
    if (gracePeriodDays !== undefined) config.gracePeriodDays = Number(gracePeriodDays);

    await config.save();

    res.status(200).json({
      success: true,
      message: 'Library policy configurations saved.',
      data: config
    });
  } catch (err) {
    console.error('Error in updateLibraryConfig:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
