import apiClient from './client';
import { API_BASE_URL } from '../utils/constants';

export type ComplaintCategory =
  | 'CLEANING_SANITATION'
  | 'EQUIPMENT_MAINTENANCE'
  | 'LAB_NETWORK_IT'
  | 'ACADEMIC_CURRICULUM'
  | 'GENERAL_ADMINISTRATIVE';

export type ComplaintPriority = 'low' | 'standard' | 'urgent';
export type ComplaintItemType = 'complaint' | 'feedback';

export interface ComplaintSubmitParams {
  category: ComplaintCategory;
  title: string;
  description: string;
  priority?: ComplaintPriority;
  itemType?: ComplaintItemType;
  imageUri?: string | null;
  imageFileName?: string | null;
  imageMimeType?: string | null;
}

export interface ComplaintStudentMeta {
  _id?: string;
  name?: string;
  email?: string;
  rollNumber?: string;
  branch?: string;
  section?: string;
  campusId?: string;
}

export interface ComplaintItem {
  _id: string;
  referenceNumber: string;
  subject: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  priority: ComplaintPriority;
  itemType: ComplaintItemType;
  imageUrl?: string | null;
  status: 'pending' | 'answered';
  displayStatus: 'UNDER_TRIAGE' | 'RESOLVED';
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  createdAt: string;
  routingTarget: string;
  student?: ComplaintStudentMeta;
}

export const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  CLEANING_SANITATION: 'Cleaning & Sanitation',
  EQUIPMENT_MAINTENANCE: 'Classroom Equipment & Infrastructure',
  LAB_NETWORK_IT: 'Network, Laboratory & IT Support',
  ACADEMIC_CURRICULUM: 'Academic Concerns & Curriculum',
  GENERAL_ADMINISTRATIVE: 'General Administrative & Amenities',
};

/**
 * Resolves the genuine institutional routing destination based on configured institutional data.
 * Unconfigured leads safely default to Administrative Triage rather than fabricating staff records.
 */
export function getCategoryRouting(category: string, userBranch?: string): { target: string; isAssigned: boolean } {
  if (category === 'ACADEMIC_CURRICULUM') {
    const dept = userBranch ? `${userBranch.toUpperCase()} Department` : 'Academic Department';
    return {
      target: `${dept} HOD & Academic Registry`,
      isAssigned: true,
    };
  }

  // Non-academic facilities leads are not configured in institutional database; safely route to Triage
  return {
    target: 'Administrative Triage / Unassigned (Campus Admin)',
    isAssigned: false,
  };
}

/**
 * Transforms a raw Doubt record from the backend into a strongly typed ComplaintItem.
 */
export function mapRawToComplaintItem(raw: any, userBranch?: string): ComplaintItem {
  const refNum = `CMP-${(raw._id || '').slice(-6).toUpperCase()}`;
  const rawSubject = raw.subject || '';

  // Detect category from explicit field or fallback subject prefix
  let catKey: ComplaintCategory = 'GENERAL_ADMINISTRATIVE';
  let cleanTitle = rawSubject;

  if (raw.category && CATEGORY_LABELS[raw.category as ComplaintCategory]) {
    catKey = raw.category as ComplaintCategory;
  } else {
    for (const key of Object.keys(CATEGORY_LABELS) as ComplaintCategory[]) {
      if (rawSubject.toUpperCase().includes(key)) {
        catKey = key;
        cleanTitle = rawSubject.replace(new RegExp(`\\[?${key}\\]?\\s*[:-]?\\s*`, 'i'), '').trim();
        break;
      }
    }
  }

  const itemType: ComplaintItemType = (raw.itemType === 'feedback' || rawSubject.toUpperCase().includes('[FEEDBACK]'))
    ? 'feedback'
    : 'complaint';

  const priority: ComplaintPriority = (raw.priority === 'urgent' || rawSubject.toUpperCase().includes('URGENT'))
    ? 'urgent'
    : (raw.priority === 'low' ? 'low' : 'standard');

  const resolvedBranch = raw.student?.branch || userBranch;
  const routing = getCategoryRouting(catKey, resolvedBranch);

  return {
    _id: raw._id,
    referenceNumber: refNum,
    subject: raw.subject,
    title: cleanTitle || raw.subject,
    description: raw.description,
    category: catKey,
    categoryLabel: CATEGORY_LABELS[catKey] || 'General Administrative',
    priority,
    itemType,
    imageUrl: raw.imageUrl
      ? (raw.imageUrl.startsWith('http') ? raw.imageUrl : `${API_BASE_URL}/api/doubts/${raw._id}/attachment`)
      : null,
    status: raw.status === 'answered' ? 'answered' : 'pending',
    displayStatus: raw.status === 'answered' ? 'RESOLVED' : 'UNDER_TRIAGE',
    answer: raw.answer || '',
    answeredBy: raw.answeredBy || '',
    answeredAt: raw.answeredAt || '',
    createdAt: raw.createdAt,
    routingTarget: routing.target,
    student: raw.student,
  };
}

export const complaintsApi = {
  /**
   * Fetches complaints and feedback submitted by the currently authenticated user.
   */
  async getMyComplaints(userBranch?: string): Promise<{ success: boolean; data: ComplaintItem[] }> {
    const res = await apiClient.get('/api/doubts/my');
    const list = (res.data?.data || []).map((raw: any) => mapRawToComplaintItem(raw, userBranch));
    return {
      success: res.data.success ?? true,
      data: list,
    };
  },

  /**
   * Fetches complaints and feedback items scoped to the user's role (HOD, Principal, Director, Admin).
   */
  async getAdminComplaints(userBranch?: string): Promise<{ success: boolean; data: ComplaintItem[] }> {
    const res = await apiClient.get('/api/doubts/admin');
    const list = (res.data?.data || []).map((raw: any) => mapRawToComplaintItem(raw, userBranch));
    return {
      success: res.data.success ?? true,
      data: list,
    };
  },

  /**
   * Submits a new actionable complaint or institutional feedback item.
   * Transmits via multipart FormData if an attachment is provided, else JSON.
   */
  async submitComplaintOrFeedback(params: ComplaintSubmitParams): Promise<{ success: boolean; data: ComplaintItem }> {
    const subjectPrefix = `[${params.itemType === 'feedback' ? 'FEEDBACK' : 'COMPLAINT'} : ${params.category}]`;
    const fullSubject = `${subjectPrefix} ${params.title.trim()}`;

    if (params.imageUri) {
      const formData = new FormData();
      formData.append('subject', fullSubject);
      formData.append('description', params.description.trim());
      formData.append('category', params.category);
      formData.append('priority', params.priority || 'standard');
      formData.append('itemType', params.itemType || 'complaint');

      const fileName = params.imageFileName || `attachment-${Date.now()}.jpg`;
      const mimeType = params.imageMimeType || 'image/jpeg';

      formData.append('image', {
        uri: params.imageUri,
        name: fileName,
        type: mimeType,
      } as any);

      const res = await apiClient.post('/api/doubts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: res.data.success ?? true,
        data: mapRawToComplaintItem(res.data.data),
      };
    }

    const res = await apiClient.post('/api/doubts', {
      subject: fullSubject,
      description: params.description.trim(),
      category: params.category,
      priority: params.priority || 'standard',
      itemType: params.itemType || 'complaint',
    });

    return {
      success: res.data.success ?? true,
      data: mapRawToComplaintItem(res.data.data),
    };
  },

  /**
   * Resolves a complaint or answers an inquiry with official administrative remarks.
   */
  async resolveComplaint(id: string, answer: string): Promise<{ success: boolean; data: any }> {
    const res = await apiClient.put(`/api/doubts/${id}/answer`, { answer: answer.trim() });
    return {
      success: res.data.success ?? true,
      data: res.data.data,
    };
  },
};
