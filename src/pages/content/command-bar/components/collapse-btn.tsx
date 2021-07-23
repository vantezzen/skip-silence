import React from 'react';
import { X } from 'react-feather';
import { browser } from 'webextension-polyfill-ts';

import ConfigProvider from '../../../shared/configProvider';

import "./collapse-btn.scss";

interface CollapseBtnProps {
  config: ConfigProvider,
}

const CollapseBtn = ({ config } : CollapseBtnProps) => {
  return (
    <div className="collapse-btn">
      <X 
        onClick={() => {
          config.set('is_bar_collapsed', !config.get('is_bar_collapsed'))
        }}
      />
    </div>
  );
};

export default CollapseBtn;
