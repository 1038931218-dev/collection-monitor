/**
 * Minimal Analytics for Market Validation
 * 
 * Records only essential funnel events:
 * - page_view
 * - upload_started
 * - upload_completed
 * - report_generated
 * - priority_viewed
 * - message_generated
 * - message_copied
 * 
 * Data stored in localStorage (client-side only)
 * No backend, no complex systems, no user tracking
 */

export type AnalyticsEvent = {
  event: string;
  timestamp: string;
  page?: string;
  session_id: string;
};

const STORAGE_KEY = 'collection_monitor_analytics';
const SESSION_KEY = 'cm_session_id';

/** Generate or retrieve session ID */
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

/** Track an event */
export function track(event: string, metadata?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  
  const sessionId = getSessionId();
  const page = window.location.pathname;
  
  const analyticsEvent: AnalyticsEvent = {
    event,
    timestamp: new Date().toISOString(),
    page,
    session_id: sessionId,
    ...metadata,
  };
  
  try {
    // Get existing events
    const existing = localStorage.getItem(STORAGE_KEY);
    const events: AnalyticsEvent[] = existing ? JSON.parse(existing) : [];
    
    // Add new event
    events.push(analyticsEvent);
    
    // Keep only last 1000 events to prevent storage overflow
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    
    // Also log to console for debugging
    console.log(`[Analytics] ${event}`, analyticsEvent);
  } catch (error) {
    console.error('[Analytics] Failed to store event:', error);
  }
}

/** Get analytics data (for debugging) */
export function getAnalytics(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
}

/** Clear analytics data */
export function clearAnalytics(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_KEY);
}

/** Export analytics as JSON for review */
export function exportAnalytics(): string {
  const events = getAnalytics();
  return JSON.stringify(events, null, 2);
}
