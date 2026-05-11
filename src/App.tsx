import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Methodology from './pages/Methodology';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/methodology" element={<Methodology />} />
      </Routes>
    </HashRouter>
  );
}
