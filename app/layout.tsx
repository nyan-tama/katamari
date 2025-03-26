import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Footer from "./components/layout/Footer";
import Header from "./components/layout/Header";
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | カタマリ - 3Dプリンターデータプラットフォーム',
    default: 'カタマリ - 3Dプリンターデータで面白い、かわいい、役に立つを共有',
  },
  description: '3Dプリンターデータで面白い、かわいい、役に立つを共有するプラットフォーム「カタマリ」。あなたの作品やデータを共有しましょう。',
  keywords: ['3Dプリンター', '3Dプリント', '3Dモデル', '作品', 'データ', 'ダウンロード'],
  authors: [{ name: 'カタマリ運営チーム' }],
  creator: 'カタマリ',
  publisher: 'カタマリ',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://katamari.jp',
    siteName: 'カタマリ',
    title: 'カタマリ - 3Dプリンターデータで面白い、かわいい、役に立つを共有',
    description: '3Dプリンターデータで面白い、かわいい、役に立つを共有するプラットフォーム「カタマリ」。あなたの作品やデータを共有しましょう。',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'カタマリ - 3Dプリンターデータプラットフォーム',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'カタマリ - 3Dプリンターデータプラットフォーム',
    description: '3Dプリンターデータで面白い、かわいい、役に立つを共有するプラットフォーム',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" data-google-analytics-opt-out={process.env.NODE_ENV === 'development' ? 'true' : undefined} suppressHydrationWarning={true}>
      <head>
        {/* Search Console 確認タグ */}
        <meta name="google-site-verification" content="提供されたコード" />
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=G-9BY7PNG4JT`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-9BY7PNG4JT');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
