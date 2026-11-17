import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import SiteLayout from "@/components/layout/SiteLayout";
import MetricoolTracker from "@/components/MetricoolTracker";
import { OG_IMAGEM_PADRAO, ROBOTS_INDEXAVEL, siteIdentityGraph } from "@/lib/seo";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-jakarta",
});

const SITE_URL = "https://piracanjuba.ai";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Piracanjuba.ai — Transparência municipal de Piracanjuba GO com IA",
    template: "%s | Piracanjuba.ai",
  },
  description:
    "Piracanjuba GO — Portal de transparência municipal com inteligência artificial. Classificados gratuitos, farmácias de plantão, WhatsApp de comércios, coleta de lixo, vereadores, contratos, licitações, servidores, salários e gastos públicos de Piracanjuba, Goiás.",
  authors: [{ name: "Ferro Labs Tecnologia LTDA" }],
  creator: "Ferro Labs Tecnologia LTDA",
  publisher: "Ferro Labs Tecnologia LTDA",
  // Sem alternates.canonical aqui: cada página define o próprio canonical (pageMetadata), e um
  // canonical no layout era herdado pelo 404 e por qualquer página nova sem metadata, apontando
  // para a home (auditoria SEO de 2026-11-17, IDX-11).
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Piracanjuba.ai",
    title: "Piracanjuba.ai — Transparência municipal de Piracanjuba GO com IA",
    description:
      "Portal de transparência municipal com IA. Projetos de lei, contratos, licitações, servidores e gastos públicos.",
    images: [OG_IMAGEM_PADRAO],
  },
  twitter: {
    card: "summary_large_image",
    title: "Piracanjuba.ai — Transparência municipal de Piracanjuba GO com IA",
    description:
      "Portal de transparência municipal com IA. Projetos de lei, contratos, licitações, servidores e gastos públicos.",
    images: [OG_IMAGEM_PADRAO],
  },
  robots: ROBOTS_INDEXAVEL,
  verification: {
    google: "yeRY3PHi6DLUuUW1HbbhJ7WHnnJaLcVekdFS6yDrKFo",
  },
  other: {
    "geo.region": "BR-GO",
    "geo.placename": "Piracanjuba, Goiás",
    "geo.position": "-17.3028;-49.0167",
    ICBM: "-17.3028, -49.0167",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Piracanjuba.ai",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a5f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Schema canonico do site — moved to lib/seo.ts pra ser referenciavel via @id
// em outras paginas (Datasets, Articles etc).
//
// IMPORTANTE: nao declaramos Piracanjuba.ai como GovernmentOrganization. O site
// e' NewsMediaOrganization independente. Prefeitura, Camara e TCM-GO aparecem
// como entidades SEPARADAS (com @id distinto + url oficial), referenciadas
// quando dados deles sao agregados — sem impersonacao.
const websiteJsonLd = siteIdentityGraph();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} font-md`}>
      <head>
        <link rel="dns-prefetch" href="https://oinweocqcptwxqsztlcl.supabase.co" />
        <link
          rel="preconnect"
          href="https://oinweocqcptwxqsztlcl.supabase.co"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="font-sans antialiased min-h-full" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`}
        </Script>

        <SiteLayout>{children}</SiteLayout>
        <MetricoolTracker />

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-Q51Q5C93RF"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-Q51Q5C93RF',{send_page_view:true});`}
        </Script>
      </body>
    </html>
  );
}
