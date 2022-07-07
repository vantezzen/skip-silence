import React, { ChangeEvent } from 'react';
import defaultConfig from '../config';
import ConfigProvider from '../configProvider';

import "./sliderSetting.scss";

interface SliderSettingProps {
  label: String | React.ReactNode,
  max: number,
  min?: number,
  step?: number,
  name: keyof typeof defaultConfig,
  config: ConfigProvider,
  unit: String,
  half: boolean,
  orange?: boolean,
  info?: React.ReactNode,
  className ?: string,
}

const SliderSetting = ({ label, max, min, step, name, config, unit, half, orange, info, className } : SliderSettingProps) => {
  const value = config.get(name);

  return (
    <div className={`slider-setting bottom-border ${orange ? 'orange' : ''} ${className ? className : ''}`}>
      <div className="setting-info">
        <label htmlFor={name} className="slider-label">{ label }</label>
        <div className="slider-info">
          <div id="slidervalue" className="value">{ half ? Math.floor(value / 2) : value }{ unit }</div>
          {info || null}
        </div>
      </div>
      <input
        type="range"
        min={min || 1}
        max={max}
        step={step || 1}
        value={value}
        className="range-slider__range"
        id={name}
        onChange={(evt) => {
          config.set(name, Number(evt.target.value));
        }}
      />
    </div>
  );
};

export default SliderSetting;
