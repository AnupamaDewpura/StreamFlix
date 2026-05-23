import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Netflix-style page */}
        <Route path="/" element={<Home />} />

        {/* Admin backdoor panel - you can change /admin to any secret URL */}
        <Route path="/hawk912" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}