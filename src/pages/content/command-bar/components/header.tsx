import React from 'react';
import { browser } from 'webextension-polyfill-ts';

import "./header.scss";

const Header = () => {
  return (
    <div className="header">
      <img 
        src={browser.runtime.getURL('/assets/img/icon-128.png')}
      />
      Skip Silence
    </div>
  );
};

export default Header;
