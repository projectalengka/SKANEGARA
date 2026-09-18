'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteNews } from '@/app/admin/content-actions';
import { DeleteButton } from '@/components/admin/FormFields';

/**
 * The delete control on the edit screen.
 *
 * Separate from the list's version because the success path differs: deleting
 * from the edit page has to navigate away, since the record it is displaying no
 * longer exists. Leaving the administrator on a form for a deleted article is a
 * small thing that reads as a bug.
 */
export function DeleteNewsButton({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState('');

  const action = async () => {
    const result = await deleteNews(id);
    if (result.ok) {
      router.push('/admin/berita');
      router.refresh();
    } else {
      setError(result.message);
    }
    return result;
  };

  return (
    <div>
      <DeleteButton action={action} label="Hapus Berita Ini" confirmLabel="Yakin hapus permanen?" />
      {error ? (
        <p role="alert" className="mt-4 text-[var(--color-accent-deep)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
