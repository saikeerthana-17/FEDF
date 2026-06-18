// Traditional Vite entry point
// Note: This project uses TanStack Start, which has its own entry point via src/start.ts
// This file is provided for compatibility and can be used as an alternative entry if needed.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import './app.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
