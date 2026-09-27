type AnalyticsProperties = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __siteAnalyticsInitialized?: boolean;
  }
}

const measurementId = import.meta.env.PUBLIC_GA4_MEASUREMENT_ID?.trim() || 'G-HDKLCPGXWH';
const validMeasurementId = /^G-[A-Z0-9]+$/i.test(measurementId);

export const trackAnalyticsEvent = (name: string, properties: AnalyticsProperties = {}): void => {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', name, properties);
  } catch {
    // Analytics must never interfere with a claim check.
  }
};

export const initializeAnalytics = (): void => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!validMeasurementId || window.__siteAnalyticsInitialized) return;

  window.__siteAnalyticsInitialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]): void {
    window.dataLayer?.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: true,
    page_location: `${window.location.origin}${window.location.pathname}`,
    page_referrer: document.referrer ? new URL(document.referrer).origin : '',
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.analytics = 'ga4';
  document.head.append(script);

  window.addEventListener('error', () => {
    trackAnalyticsEvent('client_error', { error_kind: 'uncaught' });
  });
  window.addEventListener('unhandledrejection', () => {
    trackAnalyticsEvent('client_error', { error_kind: 'unhandled_rejection' });
  });
};
