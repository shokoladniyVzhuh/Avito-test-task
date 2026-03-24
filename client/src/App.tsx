import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers.tsx';
import { appRouter } from './app/router.tsx';

function App() {
  return (
    <AppProviders>
      <RouterProvider router={appRouter} />
    </AppProviders>
  );
}

export default App;
