import React from 'react';
import { render } from 'react-dom';

import Popup from './Popup';
import './index.scss';

import 'fontsource-poppins';
import 'fontsource-poppins/600.css';

render(<Popup />, window.document.querySelector('#app-container'));
