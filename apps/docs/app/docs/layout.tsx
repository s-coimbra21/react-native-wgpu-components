import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { GithubIcon } from '@/components/icons/github';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'react-native-wgpu-components',
        url: '/',
      }}
      links={[
        {
          icon: <GithubIcon />,
          text: 'GitHub',
          url: 'https://github.com/s-coimbra21/react-native-wgpu-components',
          external: true,
        },
      ]}
      sidebar={{
        defaultOpenLevel: 1,
        collapsible: true,
      }}
    >
      {children}
    </DocsLayout>
  );
}
