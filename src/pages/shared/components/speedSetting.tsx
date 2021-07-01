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
  const isCustomValue = config.get(`${name}_is_custom`);

  return (
    <div className="speed-setting">
      <label htmlFor={name}>{ label }</label>

      {isCustomValue ? (
        <div className="custom-value-container">
          <input
            type="number" 
            value={value}
            onChange={(evt) => {
              config.set(name, Number(evt.target.value));
            }}
            step={0.1}
          />
          <button onClick={() => {
            config.set(`${name}_is_custom`, false);

            // Find nearest speed setting to the current one
            let nearestSetting = 1;
            for(const setting of speedSettings) {
              if (Math.abs(value - setting) < Math.abs(value - nearestSetting)) {
                nearestSetting = setting;
              }
            }
            config.set(name, Number(nearestSetting));
          }}>
            Drop-down
          </button>
        </div>
      ) : (
        <select
          name={name}
          id={name}
          onChange={(evt) => {
            if (evt.target.value === "custom") {
              config.set(`${name}_is_custom`, true);
            } else {
              config.set(name, Number(evt.target.value));
            }
          }}
          value={value}
        >
          {speedSettings.map((val) => (
            <option value={val} key={val}>{val}x</option>
          ))}
          <option value="custom">Custom</option>
        </select>
      )}

    </div>
  );
};

export default SpeedSetting;
