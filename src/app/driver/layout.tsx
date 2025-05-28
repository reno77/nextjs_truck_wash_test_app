'use client';

import { Header } from '@/components/Header';
import { useSession } from 'next-auth/react';

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();

  return (
    <>
      <Header user={session?.user} />
      <main className="mt-16">{children}</main>
    </>
  );
}
