'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getCurrentUser()) {
      router.push('/login');
    }
  }, [router]);

  if (!getCurrentUser()) {
    return null;
  }

  return <>{children}</>;
}
