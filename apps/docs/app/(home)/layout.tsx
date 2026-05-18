import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Github } from 'lucide-react';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout
      nav={{
        title: 'react-native-wgpu-components',
        url: '/',
      }}
      links={[
        { text: 'Docs', url: '/docs' },
        {
          icon: <Github />,
          text: 'GitHub',
          url: 'https://github.com/s-coimbra21/react-native-wgpu-components',
          external: true,
        },
      ]}
    >
      {children}
    </HomeLayout>
  );
}
