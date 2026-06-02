import { useEffect } from 'react';

type SeoHeadProps = {
  title: string;
  description: string;
  path: string;
  robots?: string;
};

const SITE_NAME = 'Paint ERP';
const SITE_URL = 'https://paintappstore.in';

function upsertMetaByName(name: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function upsertMetaByProperty(property: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', href);
}

export default function SeoHead({ title, description, path, robots = 'index, follow' }: SeoHeadProps) {
  useEffect(() => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const canonicalUrl = new URL(cleanPath, SITE_URL).toString();
    const fullTitle = `${title} | ${SITE_NAME}`;

    document.title = fullTitle;
    upsertMetaByName('description', description);
    upsertMetaByName('robots', robots);
    upsertMetaByProperty('og:type', 'website');
    upsertMetaByProperty('og:site_name', SITE_NAME);
    upsertMetaByProperty('og:title', fullTitle);
    upsertMetaByProperty('og:description', description);
    upsertMetaByProperty('og:url', canonicalUrl);
    upsertMetaByName('twitter:card', 'summary_large_image');
    upsertMetaByName('twitter:title', fullTitle);
    upsertMetaByName('twitter:description', description);
    upsertCanonical(canonicalUrl);
  }, [description, path, robots, title]);

  return null;
}
