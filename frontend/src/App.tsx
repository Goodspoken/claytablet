import { Routes, Route } from 'react-router-dom';
import Board from './pages/Board';
import HomePage from './pages/HomePage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import SharePage from './pages/SharePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/share" element={<SharePage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/:roomId" element={<Board />} />
    </Routes>
  );
}
