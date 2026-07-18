import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ResearchPage } from './pages/ResearchPage';
import { ResearchDatabasePage } from './pages/ResearchDatabasePage';
import { ResearchDataPage } from './pages/ResearchDataPage';
import { MonitorPage } from './pages/MonitorPage';
import { DiscPage } from './pages/DiscPage';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/research-database" element={<ResearchDatabasePage />} />
          <Route path="/research-database/:methodId" element={<ResearchDataPage />} />
          <Route path="/monitor" element={<MonitorPage />} />
          <Route path="/disc" element={<DiscPage />} />
          <Route path="*" element={<Navigate to="/research" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
