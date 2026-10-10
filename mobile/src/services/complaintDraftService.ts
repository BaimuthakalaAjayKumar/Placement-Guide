import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../utils/constants';
import { ComplaintCategory, ComplaintPriority, ComplaintItemType } from '../api/complaintsApi';

export type DraftStatus = 'Draft' | 'Pending submission' | 'Submitted' | 'Failed';

export interface ComplaintDraft {
  id: string; // Client-side unique draft identifier
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  itemType: ComplaintItemType;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  lastAttemptAt?: string;
  lastError?: string;
}

/**
 * Hardware-encrypted local persistence service for grievance and feedback drafts.
 *
 * SAFETY RULES:
 * 1. Only unsent or failed drafts are retained.
 * 2. Statuses explicitly distinguish 'Draft', 'Pending submission', 'Submitted', and 'Failed'.
 * 3. Never marked 'Submitted' until the server responds with HTTP 201 success.
 * 4. Automatic background replay is strictly disabled to prevent duplicate submissions on the backend;
 *    retries are explicitly user-controlled.
 * 5. Draft text is encrypted in SecureStore; binary attachments are not cached locally in insecure file paths.
 */
class ComplaintDraftService {
  private inMemoryCache: ComplaintDraft[] | null = null;

  async getDrafts(): Promise<ComplaintDraft[]> {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEYS.COMPLAINT_DRAFTS);
      if (!raw) {
        this.inMemoryCache = [];
        return [];
      }
      const parsed: ComplaintDraft[] = JSON.parse(raw);
      // Filter out submitted items if any were kept
      const activeDrafts = parsed.filter((d) => d.status !== 'Submitted');
      this.inMemoryCache = activeDrafts;
      return activeDrafts;
    } catch (err) {
      console.warn('[ComplaintDraftService] Error reading drafts from SecureStore:', err);
      return this.inMemoryCache || [];
    }
  }

  async saveDraft(params: {
    id?: string;
    title: string;
    description: string;
    category: ComplaintCategory;
    priority?: ComplaintPriority;
    itemType?: ComplaintItemType;
    status?: DraftStatus;
    lastError?: string;
  }): Promise<ComplaintDraft> {
    const drafts = await this.getDrafts();
    const now = new Date().toISOString();

    const existingIndex = params.id ? drafts.findIndex((d) => d.id === params.id) : -1;

    let targetDraft: ComplaintDraft;

    if (existingIndex >= 0) {
      targetDraft = {
        ...drafts[existingIndex],
        title: params.title.trim(),
        description: params.description.trim(),
        category: params.category,
        priority: params.priority || drafts[existingIndex].priority,
        itemType: params.itemType || drafts[existingIndex].itemType,
        status: params.status || 'Draft',
        updatedAt: now,
        lastError: params.lastError ?? drafts[existingIndex].lastError,
      };
      drafts[existingIndex] = targetDraft;
    } else {
      targetDraft = {
        id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: params.title.trim(),
        description: params.description.trim(),
        category: params.category,
        priority: params.priority || 'standard',
        itemType: params.itemType || 'complaint',
        status: params.status || 'Draft',
        createdAt: now,
        updatedAt: now,
        lastError: params.lastError,
      };
      drafts.unshift(targetDraft);
    }

    await this.persistDrafts(drafts);
    return targetDraft;
  }

  async updateDraftStatus(id: string, status: DraftStatus, lastError?: string): Promise<void> {
    const drafts = await this.getDrafts();
    const index = drafts.findIndex((d) => d.id === id);
    if (index >= 0) {
      drafts[index].status = status;
      drafts[index].updatedAt = new Date().toISOString();
      if (status === 'Pending submission') {
        drafts[index].lastAttemptAt = new Date().toISOString();
      }
      if (lastError !== undefined) {
        drafts[index].lastError = lastError;
      }
      if (status === 'Submitted') {
        // Remove submitted drafts from local storage
        drafts.splice(index, 1);
      }
      await this.persistDrafts(drafts);
    }
  }

  async deleteDraft(id: string): Promise<void> {
    const drafts = await this.getDrafts();
    const filtered = drafts.filter((d) => d.id !== id);
    await this.persistDrafts(filtered);
  }

  private async persistDrafts(drafts: ComplaintDraft[]): Promise<void> {
    try {
      this.inMemoryCache = drafts;
      await SecureStore.setItemAsync(STORAGE_KEYS.COMPLAINT_DRAFTS, JSON.stringify(drafts));
    } catch (err) {
      console.error('[ComplaintDraftService] Failed to persist drafts to SecureStore:', err);
    }
  }
}

export const complaintDraftService = new ComplaintDraftService();
