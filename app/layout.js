import './globals.css';
import { ToastProvider } from '@/components/ui';

export const viewport = { width: 'device-width', initialScale: 1 };

export const metadata = {
  title: 'SIMBA - Sistem Manajemen Bahan Bangunan',
  description: 'Manajemen gudang bahan bangunan: stok, transaksi, restock, dan supplier',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#dfe2e5]" suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
