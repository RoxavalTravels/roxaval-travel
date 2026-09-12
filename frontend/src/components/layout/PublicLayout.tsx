import { LanguageWelcome } from './LanguageWelcome';
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader } from '../ui/Loader';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingWhatsApp } from './FloatingWhatsApp';
import { BirthdayBanner } from './BirthdayBanner';
import { organizationSchema } from '../../lib/seo';

export function PublicLayout() {
  return (
    <div className="w-full min-h-screen bg-cream flex flex-col">
      {/* Sitewide TravelAgency/Organization identity -- present on every
          public page so Google can associate all of them with one entity. */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(organizationSchema())}</script>
      </Helmet>
      <Loader />
      <Navbar />
      <LanguageWelcome />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
      <FloatingWhatsApp />
      <BirthdayBanner />
    </div>);

}
