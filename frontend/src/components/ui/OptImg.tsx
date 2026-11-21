import { ComponentProps } from 'react';
import { optimizeImageUrl } from '../../lib/images';

type OptImgProps = Omit<ComponentProps<'img'>, 'src'> & { src?: string | null; w: number };

// <img> that asks for a display-size version of the picture (w = the widest it is ever shown, in CSS px x2 for
// retina). If the resized URL fails it falls back once to the original, so a picture can never go missing.
export function OptImg({ src, w, loading = 'lazy', decoding = 'async', onError, ...rest }: OptImgProps) {
  const original = src || '';
  const optimized = optimizeImageUrl(original, w);
  return (
    <img
      {...rest}
      src={optimized}
      loading={loading}
      decoding={decoding}
      onError={(e) => {
        const img = e.currentTarget;
        if (optimized !== original && !img.dataset.optFallback) {
          img.dataset.optFallback = 'true';
          img.src = original;
          return;
        }
        onError?.(e);
      }} />
  );
}
