import React from 'react';
import { Seo } from '../components/seo/Seo';
import { Hero } from '../components/sections/Hero';
import { Destinations } from '../components/sections/Destinations';
import { Packages } from '../components/sections/Packages';
import { CustomTourCta } from '../components/sections/CustomTourCta';
import { Activities } from '../components/sections/Activities';
import { Stats } from '../components/sections/Stats';
import { WhyChoose } from '../components/sections/WhyChoose';
import { CoreValues } from '../components/sections/CoreValues';
import { HotelPartners } from '../components/sections/HotelPartners';
import { Reviews } from '../components/sections/Reviews';
import { Blog } from '../components/sections/Blog';
import { TravelIntroduction } from '../components/sections/TravelIntroduction';

export function Home() {
  return (
    <main>
      <Seo
        title="Sri Lanka Tours & Holiday Packages | Roxaval Travels"
        description="Discover Sri Lanka with Roxaval Travels — private tour packages, honeymoon tours, wildlife safaris, beach holidays and fully custom Sri Lanka tours, planned and booked in one place."
        keywords="Sri Lanka travel, Sri Lanka tour packages, private tours Sri Lanka, honeymoon tours Sri Lanka, wildlife tours Sri Lanka, beach holidays Sri Lanka, custom Sri Lanka tours" />

      <Hero />
      <TravelIntroduction />
      <Destinations />
      <Packages />
      <CustomTourCta />
      <Activities />
      <Stats />
      <WhyChoose />
      <CoreValues />
      <HotelPartners />
      <Reviews />
      <Blog />
    </main>);

}
