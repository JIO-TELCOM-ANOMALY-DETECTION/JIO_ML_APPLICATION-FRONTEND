export type FeedbackEntry = { id: string; category: 'Bug'|'Usability'|'Documentation'|'Feature request'|'Other'; rating?: number; message: string; feature?: string; route: string; timestamp: string; version?: string };
const key = 'jio-feedback-v1';
export const feedbackStorage = {
  read(): FeedbackEntry[] { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value as FeedbackEntry[] : []; } catch { return []; } },
  write(entries: FeedbackEntry[]): void { localStorage.setItem(key, JSON.stringify(entries)); },
  add(entry: FeedbackEntry): FeedbackEntry[] { const entries = [entry, ...this.read()]; this.write(entries); return entries; },
  remove(id: string): FeedbackEntry[] { const entries = this.read().filter(item => item.id !== id); this.write(entries); return entries; },
  clear(): void { localStorage.removeItem(key); },
};
