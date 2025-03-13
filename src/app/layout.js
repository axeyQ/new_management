import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { NetworkProvider } from '@/context/NetworkContext';
import dynamic from 'next/dynamic';
import IndexedDBInitializer from '@/components/IndexedDBInitializer';
const inter = Inter({ subsets: ['latin'] });


export const metadata = {
  title: 'Restaurant Management System',
  description: 'A comprehensive system for restaurant management',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NetworkProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" />
            <IndexedDBInitializer />
          </AuthProvider>
        </NetworkProvider>
      </body>
    </html>
  );
}