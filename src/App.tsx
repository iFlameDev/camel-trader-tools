import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ResearchPage } from './pages/ResearchPage';
import { ResearchDatabasePage } from './pages/ResearchDatabasePage';
import { MonitorPage } from './pages/MonitorPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/research-database" element={<ResearchDatabasePage />} />
          <Route path="/monitor" element={<MonitorPage />} />
          <Route path="*" element={<Navigate to="/research" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
