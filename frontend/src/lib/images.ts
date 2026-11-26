// Display-size versions of catalog images. Cloudinary originals were served untouched (one blog image was
// 2.3 MB) and Wikimedia / Pinterest hotlinks at full size. These helpers only rewrite the URL used for
// display; the stored data is never changed. Anything unrecognised is returned as-is.
import localVariants from './localImageVariants.json';

const WIKIMEDIA_STEPS = [250, 330, 500, 960, 1280, 1920]; // Wikimedia only serves these thumbnail widths
const PINTEREST_STEPS = [236, 474, 564, 736, 1200];
// Smallest available size that is at least 90% of the wanted width (736px is fine for an 800px slot).
const pick = (steps: number[], width: number) => steps.find((s) => s >= width * 0.9) ?? steps[steps.length - 1];

const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
const WIKIMEDIA_THUMB = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[a-z-]+\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/[^/]+\/)(\d+)px-(.+)$/i;
const WIKIMEDIA_ORIGINAL = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[a-z-]+)\/([0-9a-f]\/[0-9a-f]{2}\/([^/]+\.(?:jpe?g|png)))$/i;
// JPG photos that ship with the site at the web root (public/*.jpg). scripts/build-local-image-variants.py makes small
// WebP copies under /optimized/ and lists them in localImageVariants.json; the original stays as the fallback.
const LOCAL_ROOT_JPG = /^\/([A-Za-z0-9._-]+)\.jpe?g$/i;
const LOCAL_VARIANTS = localVariants as Record<string, number[]>;
const PINTEREST = /^(https:\/\/i\.pinimg\.com\/)(originals|\d+x)\/(.+\.jpe?g)$/i;

export function optimizeImageUrl(url: string | null | undefined, width: number): string {
  if (!url) return '';

  const local = LOCAL_ROOT_JPG.exec(url);
  if (local) {
    const widths = LOCAL_VARIANTS[url.slice(1)];
    if (!widths?.length) return url;
    return `/optimized/${local[1]}-${pick(widths, width)}.webp`;
  }

  const cloudinary = CLOUDINARY.exec(url);
  if (cloudinary) {
    const [, base, rest] = cloudinary;
    const first = rest.split('/')[0];
    const alreadyTransformed = /^[a-z]{1,3}_[^/]+/i.test(first) && !/^v\d+$/.test(first);
    return alreadyTransformed ? url : `${base}f_auto,q_auto,w_${width},c_limit/${rest}`;
  }

  const thumb = WIKIMEDIA_THUMB.exec(url);
  if (thumb) {
    const target = pick(WIKIMEDIA_STEPS, width);
    return Number(thumb[2]) > target ? `${thumb[1]}${target}px-${thumb[3]}` : url;
  }
  const original = WIKIMEDIA_ORIGINAL.exec(url);
  if (original) return `${original[1]}/thumb/${original[2]}/${pick(WIKIMEDIA_STEPS, width)}px-${original[3]}`;

  const pinterest = PINTEREST.exec(url);
  if (pinterest) {
    const target = pick(PINTEREST_STEPS, width);
    const current = pinterest[2].toLowerCase() === 'originals' ? Infinity : parseInt(pinterest[2], 10);
    return current <= target ? url : `${pinterest[1]}${target}x/${pinterest[3]}`;
  }

  return url;
}
