import React from 'react';
import { render } from 'react-dom';

import 'fontsource-poppins';
import 'fontsource-poppins/600.css';

import Bar from './Bar';

const containerElement = window.document.createElement('div');
containerElement.id = 'skip-silence-bar';
window.document.body.appendChild(containerElement);

render(<Bar />, containerElement);
