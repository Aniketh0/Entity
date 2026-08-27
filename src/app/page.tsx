'use client';

import dynamic from 'next/dynamic';

// The Entity is a pure WebGL organism — it must never be server rendered.
const EntityScene = dynamic(() => import('@/components/entity/EntityScene'), {
  ssr: false,
  loading: () => <div className="entity-boot" aria-hidden />,
});

export default function Page() {
  return (
    <main className="entity-root">
      <EntityScene />
      <noscript>
        <div className="entity-noscript">THE ENTITY requires JavaScript and WebGL.</div>
      </noscript>
    </main>
  );
}
