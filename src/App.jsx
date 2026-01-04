import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import ShopPage from './pages/ShopPage';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ShopPage />} />
      </Routes>
    </Router>
  );
}

export default App;
