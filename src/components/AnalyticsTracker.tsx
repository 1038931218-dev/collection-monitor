'use client';
import { useEffect } from 'react';
import { track } from '@/lib/analytics';

export default function AnalyticsTracker() {
  useEffect(() => {
    // Track page view on mount
    track('page_view', { page: window.location.pathname });
    
    // Track visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        track('page_view', { page: window.location.pathname, event: 'tab_visible' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  return null;
}
