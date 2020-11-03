import React from 'react';
import ConfigProvider from '../../shared/configProvider';

import "./speedSetting.scss";

interface SpeedSettingProps {
  label: String,
  name: "playback_speed" | "silence_speed",
  config: ConfigProvider
}

const SpeedSetting = ({ label, name, config } : SpeedSettingProps) => {
  const value = config.get(name);

  return (
    <div className="speed-setting">
      <label htmlFor={name}>{ label }</label>

      <select
        name={name}
        id={name}
        onChange={(evt) => {
          config.set(name, Number(evt.target.value));
        }}
        value={value}
      >
        <option value="0.5">0.5x</option>
        <option value="0.75">0.75x</option>
        <option value="1">1x</option>
        <option value="1.25">1.25x</option>
        <option value="1.5">1.5x</option>
        <option value="1.75">1.75x</option>
        <option value="2">2x</option>
        <option value="2.25">2.25x</option>
        <option value="2.5">2.5x</option>
        <option value="2.75">2.75x</option>
        <option value="3">3x</option>
        <option value="3.5">3.5x</option>
        <option value="4">4x</option>
        <option value="4.5">4.5x</option>
        <option value="5">5x</option>
      </select>
    </div>
  );
};

export default SpeedSetting;
