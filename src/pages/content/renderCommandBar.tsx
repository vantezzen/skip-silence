import React from 'react';
import { render as RenderReact } from 'react-dom';
import ConfigProvider from '../shared/configProvider';
import Bar from './command-bar/Bar';

export default function renderCommandBar(config: ConfigProvider) {
  const containerElement = window.document.createElement('div');
  containerElement.id = 'skip-silence-bar';
  window.document.body.appendChild(containerElement);

  RenderReact(<Bar config={config} />, containerElement);
}
