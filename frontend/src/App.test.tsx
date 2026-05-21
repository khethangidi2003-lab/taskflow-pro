import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders without crashing', () => {
  render(<App />);
  // Just check that the app renders successfully
  const appElement = document.querySelector('.app');
  expect(appElement).toBeInTheDocument();
});