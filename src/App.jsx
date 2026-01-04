import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import ShopPage from './pages/ShopPage';
import CommunityForgePage from './pages/CommunityForgePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ShopPage />} />
        <Route path="/community-forge" element={<CommunityForgePage />} />
      </Routes>
    </Router>
  );
}

export default App;
