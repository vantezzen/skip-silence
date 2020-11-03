import React, { ChangeEvent } from 'react';

import "./mainSwitch.scss";

interface MainSwitchProps {
  enabled: boolean,
  onSwitch: (event: ChangeEvent<HTMLInputElement>) => void,
}

const MainSwitch = ({ enabled, onSwitch } : MainSwitchProps) => {
  return (
    <div className="main-switch">
      <input id="mainSwitch" type="checkbox" className="switch" checked={enabled} onChange={onSwitch} />
      <label htmlFor="mainSwitch">Enable Skip Silence</label>
    </div>
  );
};

export default MainSwitch;
