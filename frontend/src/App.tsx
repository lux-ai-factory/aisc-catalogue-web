import { Routes, Route, Navigate } from "react-router-dom";
import Catalogue from "./pages/Catalogue";
import Metrics from "./pages/Metrics";

function App() {
  return (
    <div className="app-container">
      <main className="app-main">
        <Routes>
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/metrics" element={<Metrics />} />
          {/* There are no accounts and no add/edit pages: any other path leads
              to the catalogue. */}
          <Route path="/" element={<Navigate to="/catalogue" replace />} />
          <Route path="*" element={<Navigate to="/catalogue" replace />} />
        </Routes>
      </main>
    </div>
  );
}
export default App;
