import { OptImg } from '../ui/OptImg';
import { ComponentProps } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { getCurrentLanguage } from '../../i18n';
import { pageTranslation } from '../../i18n/routing';
import { isInitialPublicRoute } from './InitialPublicContent';

export function LocalizedHeading({ children, ...props }: ComponentProps<'h1'>) {
  const { pathname } = useLocation();
  return <h1 {...props}>{pageTranslation(pathname, getCurrentLanguage())?.h1 || children}</h1>;
}
export function LocalizedImage({ alt, w, ...props }: ComponentProps<'img'> & { w?: number }) {
  const { pathname } = useLocation();
  const text = pageTranslation(pathname, getCurrentLanguage())?.imageAlt || alt;
  // Hero images: `w` asks for a display-size version (see lib/images.ts); they load eagerly as they are the LCP element.
  return w ? <OptImg {...props} w={w} loading={props.loading ?? 'eager'} alt={text} /> : <img {...props} alt={text} />;
}
export function LocalizedMotionHeading({ children, ...props }: HTMLMotionProps<'h1'>) {
  const { pathname } = useLocation();
  return <motion.h1 {...props} initial={isInitialPublicRoute() ? false : props.initial}>{pageTranslation(pathname, getCurrentLanguage())?.h1 || children}</motion.h1>;
}
