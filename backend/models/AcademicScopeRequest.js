const mongoose = require('mongoose');

/**
 * CAMPUSBRIDGE — ACADEMIC SCOPE CHANGE REQUEST MODEL
 * Additive schema representing formal student requests to adjust
 * branch, classroom section, or academic year.
 * 
 * DESIGN PRINCIPLES:
 * 1. Preservation & Safety: Submitting a request never mutates authoritative
 *    academic records, student profile fields, marks, SGPA, or CGPA.
 * 2. Institutional Traceability: Captures snapshot of scope at submission time,
 *    requested target scope, justification, and full review audit trail.
 * 3. Scope Isolation: Enforces campusId and departmentId boundaries.
 */

const AcademicScopeRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student requester ID is required'],
      index: true
    },
    campusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campus',
      default: null,
      index: true
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true
    },
    currentScope: {
      academicYear: {
        type: String,
        default: '',
        trim: true
      },
      academicSession: {
        type: String,
        default: '',
        trim: true
      },
      branch: {
        type: String,
        default: '',
        trim: true
      },
      section: {
        type: String,
        default: '',
        trim: true
      }
    },
    requestedScope: {
      academicYear: {
        type: String,
        required: [true, 'Requested academic year is required'],
        trim: true
      },
      branch: {
        type: String,
        required: [true, 'Requested branch is required'],
        trim: true
      },
      section: {
        type: String,
        required: [true, 'Requested section is required'],
        trim: true
      }
    },
    justification: {
      type: String,
      required: [true, 'Please provide an official justification for this request'],
      trim: true,
      minlength: [5, 'Justification must be at least 5 characters long'],
      maxlength: [1000, 'Justification cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },
    // Auditable Review Metadata
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewNotes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Review notes cannot exceed 1000 characters']
    },
    reviewDecision: {
      type: String,
      enum: ['APPROVED', 'REJECTED', null],
      default: null
    },
    previousScopeSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for optimized querying
AcademicScopeRequestSchema.index({ student: 1, status: 1 });
AcademicScopeRequestSchema.index({ campusId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('AcademicScopeRequest', AcademicScopeRequestSchema);
