import type { Metadata } from "next";

const SITE_URL = "https://piracanjuba.ai";

export function pageMetadata(opts: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}): Metadata {
  const url = opts.path ? `${SITE_URL}${opts.path}` : SITE_URL;
  const image = opts.image || "/icon-192.png";

  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path || "/" },
    robots: opts.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: opts.type || "website",
      locale: "pt_BR",
      url,
      siteName: "Piracanjuba.ai",
      title: opts.title,
      description: opts.description,
      images: [{ url: image, alt: opts.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
