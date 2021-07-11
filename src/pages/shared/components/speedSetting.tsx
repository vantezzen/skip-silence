import React from 'react';
import ConfigProvider from '../configProvider';
import speedSettings from '../speedSettings';

import "./speedSetting.scss";

interface SpeedSettingProps {
  label: String,
  name: "playback_speed" | "silence_speed",
  config: ConfigProvider
}

type IsCustomKeys = "silence_speed_is_custom" | "playback_speed_is_custom";

const SpeedSetting = ({ label, name, config } : SpeedSettingProps) => {
  const value = config.get(name);
  const isCustomValue = config.get(`${name}_is_custom` as IsCustomKeys);

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

              if (config.env === "popup") {
                window.sa_event(`speed_${name}_custom_${evt.target.value}`);
                window.plausible('speed_custom', { props: { name, speed: evt.target.value } });
              }
            }}
            step={0.1}
            min={0.0625}
            max={16}
          />
          <button onClick={() => {
            config.set(`${name}_is_custom` as IsCustomKeys, false);

            if (config.env === "popup") {
              window.sa_event(`speed_${name}_dropdown`);
              window.plausible('speed_use_dropdown');
            }

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
              config.set(`${name}_is_custom` as IsCustomKeys, true);
            } else {
              config.set(name, Number(evt.target.value));
            }
            if (config.env === "popup") {
              window.sa_event(`speed_${name}_dropdown_${evt.target.value}`);
              window.plausible('speed_dropdown', { props: { name, speed: evt.target.value } });
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
