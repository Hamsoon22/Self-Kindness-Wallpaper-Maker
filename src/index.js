import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';       // 여기서 Tailwind CSS 불러옴
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
