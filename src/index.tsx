import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App.tsx';
import './index.css';
import { SettingsProvider, ImageProvider } from './settings';
import { VibratorProvider } from './utils';
import { LocalImageProvider } from './local/LocalProvider.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <ImageProvider>
        <LocalImageProvider>
          <VibratorProvider>
            <App />
          </VibratorProvider>
        </LocalImageProvider>
      </ImageProvider>
    </SettingsProvider>
  </React.StrictMode>
);
