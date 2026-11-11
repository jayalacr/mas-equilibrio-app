import { Redirect, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { getProfile } from '@/db/queries/profile';

export default function Index() {
  const [target, setTarget] = useState<Href | null>(null);

  // Sin perfil = primera vez que se abre la app.
  useEffect(() => {
    getProfile().then((profile) => setTarget(profile ? '/hoy' : '/bienvenida'));
  }, []);

  if (!target) return null;
  return <Redirect href={target} />;
}
