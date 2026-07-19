// A lightweight error monitoring utility for production hardening

export function logError(error: any, context?: Record<string, any>) {
    console.error("SUPPORT SYSTEM ERROR:", error.message || error, context || {});
    
    // In a real production deployment, this would be wired to Sentry, Datadog, or similar:
    // if (process.env.NODE_ENV === 'production') {
    //     Sentry.captureException(error, { extra: context });
    // }
}
