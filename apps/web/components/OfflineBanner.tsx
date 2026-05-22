'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

/**
 * OfflineBanner - Displays connection status to user
 * Shows when offline, hides when online
 * Can be dismissed by user and reappears if connection is lost
 */
export function OfflineBanner() {
  const { isOffline, isStatusDirty } = useOfflineStatus();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const t = useTranslations();

  // Reset dismissal state when status changes
  useEffect(() => {
    if (isStatusDirty) {
      setIsDismissed(false);
    }
  }, [isStatusDirty]);

  // Trigger animation on state change
  useEffect(() => {
    if (isOffline && !isDismissed) {
      // Small delay for animation smoothness
      const timer = setTimeout(() => setShowAnimation(true), 10);
      return () => clearTimeout(timer);
    }
  }, [isOffline, isDismissed]);

  // Auto-hide banner 5 seconds after coming back online
  useEffect(() => {
    if (!isOffline && showAnimation) {
      const timer = setTimeout(() => {
        setShowAnimation(false);
        setIsDismissed(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, showAnimation]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowAnimation(false);
  };

  // Render nothing if online and not showing
  if (!isOffline && !showAnimation) {
    return null;
  }

  const bannerText = isOffline
    ? t('offline.bannerOffline', 'You are offline')
    : t('offline.bannerOnline', 'Back online');

  const bannerDescription = isOffline
    ? t('offline.descriptionOffline', 'Your changes will sync when connection returns')
    : t('offline.descriptionOnline', 'Retrying failed requests...');

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showAnimation ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      } ${isOffline ? 'bg-amber-500/90 backdrop-blur-md' : 'bg-emerald-500/90 backdrop-blur-md'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            {isOffline ? (
              <WifiOff size={20} className="text-white flex-shrink-0" />
            ) : (
              <Wifi size={20} className="text-white flex-shrink-0 animate-pulse" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">{bannerText}</p>
              <p className="text-white/80 text-xs">{bannerDescription}</p>
            </div>
          </div>

          {isOffline && (
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white font-medium text-sm px-3 py-1.5 rounded-md hover:bg-white/20 transition-colors flex-shrink-0"
              aria-label={t('offline.dismiss', 'Dismiss')}
            >
              {t('offline.dismiss', 'Dismiss')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
