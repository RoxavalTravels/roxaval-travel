// Preserve the server-rendered public view while route code/translations load.
// This is progressive replacement, not React hydration or bot-only rendering.
const initialPath = typeof window === 'undefined' ? '' : window.location.pathname;
const initialContent = typeof document === 'undefined' ? '' : document.getElementById('public-initial-content')?.outerHTML || '';
const initialPage = typeof document === 'undefined' ? '' : document.querySelector('[data-initial-page]')?.outerHTML || '';
export const isInitialPublicRoute = () => Boolean(initialContent && window.location.pathname === initialPath);

// Used inside PublicLayout: retain the page, not a second navigation/header.
export function InitialPublicPage({ children }: { children?: React.ReactNode }) {
  return isInitialPublicRoute() && initialPage ? <div dangerouslySetInnerHTML={{ __html: initialPage }} /> : <>{children}</>;
}

export function InitialPublicContent({ children }: { children?: React.ReactNode }) {
  if (initialContent && window.location.pathname === initialPath) {
    return <div dangerouslySetInnerHTML={{ __html: initialContent }} />;
  }
  return <>{children}</>;
}
