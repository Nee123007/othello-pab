import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { BoardDemoPage } from './pages/BoardDemo';
import { PlayPage } from './pages/Play';
import { LabPage } from './pages/Lab';
import { BenchmarksPage } from './pages/Benchmarks';
import { AboutPage } from './pages/About';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen w-full flex flex-col bg-ink-950 text-text-100 font-sans selection:bg-brass-400/20 selection:text-brass-400 overflow-x-hidden">
        <Navbar />
        <main className="flex-1 w-full overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/play" replace />} />
            <Route path="/play" element={<PlayPage />} />
            <Route path="/lab" element={<LabPage />} />
            <Route path="/benchmarks" element={<BenchmarksPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/board-demo" element={<BoardDemoPage />} />
            <Route path="*" element={<Navigate to="/play" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
