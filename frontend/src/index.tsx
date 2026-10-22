import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import App from './App';
import { CrossSiteProvider } from './crossSite/CrossSiteContext';
import { loadInstallOrigins, startCrossSiteSession } from './crossSite/connect';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
// The launcher's handshake may come from an engine that moved off its port, which only the
// install's /origins.json knows: read it first, then the handshake, then render (the "/" redirect
// drops the fragment as soon as the app mounts). On a site without it, this is one failed request.
loadInstallOrigins().then(() => {
  startCrossSiteSession();
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
});
