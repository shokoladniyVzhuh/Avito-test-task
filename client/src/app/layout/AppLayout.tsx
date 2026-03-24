import { AppShell, Container } from '@mantine/core';
import { Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <AppShell padding="xl">
      <AppShell.Main>
        <Container size={1440}>
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
