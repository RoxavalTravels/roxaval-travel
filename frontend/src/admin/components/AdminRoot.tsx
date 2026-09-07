import React from 'react';
import { Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ToastProvider } from './ToastProvider';
import { ConfirmDialogProvider } from './ConfirmDialog';

// Auth is provided once, app-wide, in App.tsx (shared with the public site).
export function AdminRoot() {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        {/* Defense-in-depth alongside the robots.txt Disallow: /admin --
            keeps admin pages out of search results even if something
            somewhere links to one directly. */}
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <Outlet />
      </ConfirmDialogProvider>
    </ToastProvider>);

}
