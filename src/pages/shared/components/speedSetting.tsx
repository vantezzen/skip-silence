import React from 'react';
import ConfigProvider from '../configProvider';
import speedSettings from '../speedSettings';

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
        {speedSettings.map((val) => (
          <option value={val}>{val}x</option>
        ))}
      </select>
    </div>
  );
};

export default SpeedSetting;
