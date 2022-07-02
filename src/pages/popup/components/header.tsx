import React from 'react';
import __ from '../../shared/i18n';

import './header.scss';

const Header = () => {
  return (
    <div className="header">
      <img src="/assets/img/icon-128.png" />
      <h1>{__('extensionName')} 5</h1>
    </div>
  );
};

export default Header;
