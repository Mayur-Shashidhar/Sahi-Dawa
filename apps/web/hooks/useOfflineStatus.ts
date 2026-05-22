'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Hook to manage offline/online status and automatic retry on reconnection
 * Detects network connectivity and provides callbacks for retry logic
 */
export const useOfflineStatus = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [isStatusDirty, setIsStatusDirty] = useState(false);
  const retryCallbacksRef = useRef<Set<() => void>>(new Set());

  useEffect(() => {
    // Check initial connectivity status
    const handleOnline = () => {
      setIsOffline(false);
      setIsStatusDirty(true);
      // Execute all retry callbacks when coming back online
      retryCallbacksRef.current.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error executing retry callback:', error);
        }
      });
      retryCallbacksRef.current.clear();
      // Reset dirty flag after a short delay so UI can update
      setTimeout(() => setIsStatusDirty(false), 1000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setIsStatusDirty(true);
    };

    // Set initial state based on navigator.onLine
    if (typeof window !== 'undefined') {
      setIsOffline(!window.navigator.onLine);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const registerRetryCallback = useCallback((callback: () => void) => {
    retryCallbacksRef.current.add(callback);
  }, []);

  const unregisterRetryCallback = useCallback((callback: () => void) => {
    retryCallbacksRef.current.delete(callback);
  }, []);

  return {
    isOffline,
    isStatusDirty,
    registerRetryCallback,
    unregisterRetryCallback,
  };
};
