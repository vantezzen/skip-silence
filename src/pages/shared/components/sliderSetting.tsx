import React, { ChangeEvent } from 'react';
import ConfigProvider from '../configProvider';

import "./sliderSetting.scss";

interface SliderSettingProps {
  label: String,
  max: number,
  name: "silence_threshold" | "samples_threshold",
  config: ConfigProvider,
  unit: String,
  half: boolean,
  disabled?: boolean
}

const SliderSetting = ({ label, max, name, config, unit, half, disabled } : SliderSettingProps) => {
  const value = config.get(name);

  return (
    <div className="slider-setting">
      <div className="setting-info">
        <label htmlFor={name}>{ label }</label>
        <div id="slidervalue" className="value">{ half ? Math.floor(value / 2) : value }{ unit }</div>
      </div>
      <input
        type="range"
        min="1"
        max={max}
        value={value}
        className="range-slider__range"
        id={name}
        onChange={(evt) => {
          config.set(name, Number(evt.target.value));
        }}
        disabled={disabled}
      />
    </div>
  );
};

export default SliderSetting;
