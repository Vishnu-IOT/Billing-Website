/**
 * Normalises a company `logo_url` so it can be used directly in <img src>.
 * - trims whitespace
 * - converts Google Drive "share" links into direct-view links
 * Returns '' when there is no usable URL.
 */
export function getLogoSrc(url) {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  if (!u) return '';

  // https://drive.google.com/file/d/<ID>/view?usp=sharing
  let m = u.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  // https://drive.google.com/open?id=<ID>  |  .../uc?id=<ID>
  if (!m) m = u.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([^&#]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400`;

  return u;
}

/** Reads the logo from any company-shaped object (logo_url preferred). */
export function getCompanyLogo(company) {
  return getLogoSrc(company?.logo_url || company?.logo || '');
}
