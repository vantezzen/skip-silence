import React, { ChangeEvent } from 'react';
import ConfigProvider from '../configProvider';

import "./switch.scss";

interface SwitchProps {
  label: string,
  name: "enabled" | "mute_silence" | "is_bar_icon_enabled" | "allow_analytics",
  config: ConfigProvider
}

const Switch = ({ label, name, config } : SwitchProps) => {
  return (
    <div className="switch">
      <input id={name} type="checkbox" className="switch" checked={config.get(name)} onChange={(evt) => {
        config.set(name, evt.target.checked);

        if (config.env === "popup") {
          window.sa_event(`setting_${name}_${evt.target.checked ? 'enable' : 'disable'}`);
        }
      }} />
      <label htmlFor={name}>{label}</label>
    </div>
  );
};

export default Switch;
