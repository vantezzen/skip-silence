import React from 'react';
import { render } from 'react-dom';

import Popup from './Popup';
import './index.scss';

import 'fontsource-poppins';
import 'fontsource-poppins/600.css';

// Simple Analytics Event Wrapper
window.sa_event=window.sa_event||function(){var a=[].slice.call(arguments);window.sa_event.q?window.sa_event.q.push(a):window.sa_event.q=[a]};
window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }

render(<Popup />, window.document.querySelector('#app-container'));
