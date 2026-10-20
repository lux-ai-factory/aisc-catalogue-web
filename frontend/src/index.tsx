import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import App from './App';
import { CrossSiteProvider } from './crossSite/CrossSiteContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    {/* The build can be served under a path prefix (CATALOGUE_BASE). */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <CrossSiteProvider>
        <App />
      </CrossSiteProvider>
    </BrowserRouter>
  </React.StrictMode>
);
