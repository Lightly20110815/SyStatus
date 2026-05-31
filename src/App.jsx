import { Routes, Route } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import RecordPage from "./pages/RecordPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import StatsPage from "./pages/StatsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<RecordPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<RecordPage />} />
      </Route>
    </Routes>
  );
}
