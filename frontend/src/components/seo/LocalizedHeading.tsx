import { ComponentProps } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { getCurrentLanguage } from '../../i18n';
import { pageTranslation } from '../../i18n/routing';

export function LocalizedHeading({ children, ...props }: ComponentProps<'h1'>) {
  const { pathname } = useLocation();
  return <h1 {...props}>{pageTranslation(pathname, getCurrentLanguage())?.h1 || children}</h1>;
}
export function LocalizedImage({ alt, ...props }: ComponentProps<'img'>) {
  const { pathname } = useLocation();
  return <img {...props} alt={pageTranslation(pathname, getCurrentLanguage())?.imageAlt || alt} />;
}
export function LocalizedMotionHeading({ children, ...props }: HTMLMotionProps<'h1'>) {
  const { pathname } = useLocation();
  return <motion.h1 {...props}>{pageTranslation(pathname, getCurrentLanguage())?.h1 || children}</motion.h1>;
}
