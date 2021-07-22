import React from 'react';
import { CSSTransition } from 'react-transition-group';
import ConfigProvider from '../configProvider';
import speedSettings from '../speedSettings';

import "./speedSetting.scss";

interface SpeedSettingProps {
  label: String | React.ReactNode,
  name: "playback_speed" | "silence_speed",
  config: ConfigProvider,
  isPlus?: boolean,
  showPlusPopup?: () => void,
  info?: React.ReactNode,
}

type IsCustomKeys = "silence_speed_is_custom" | "playback_speed_is_custom";

const SpeedSetting = ({ label, name, config, isPlus, showPlusPopup, info } : SpeedSettingProps) => {
  const value = config.get(name);
  const isCustomValue = config.get(`${name}_is_custom` as IsCustomKeys);
  const [isOpen, setIsOpen] = React.useState(false);

  let selector;
  if (isCustomValue) {
    // Selector is an input field
    selector = (
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
          Dropdown
        </button>
      </div>
    );
  } else {
    selector = (
      <select
        name={name}
        id={name}
        onChange={(evt) => {
          if (evt.target.value === "custom") {
            if (isPlus) {
              config.set(`${name}_is_custom` as IsCustomKeys, true);
            } else if (showPlusPopup) {
              showPlusPopup();
            }
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
        <option value="custom">Custom{!isPlus && ' ★'}</option>
      </select>
    );

    selector = (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10 }}>
        {speedSettings.map((val) => (
          <button className={`value-option ${val === value ? 'active' : ''}`} onClick={() => {
            config.set(name, Number(val));
            window.sa_event(`speed_${name}_dropdown_${val}`);
            window.plausible('speed_dropdown', { props: { name, speed: val } });
          }}>
            { val }x
          </button>
        ))}

        {/* CUstom value option */}
        <button className='value-option' onClick={() => {
          if (isPlus) {
            config.set(`${name}_is_custom` as IsCustomKeys, true);
          } else if (showPlusPopup) {
            showPlusPopup();
          }

          window.sa_event(`speed_${name}_dropdown_custom`);
          window.plausible('speed_dropdown', { props: { name, speed: 'custom' } });
        }} style={{ gridColumn: 'span 4 / span 1', aspectRatio: 'auto' }}>
          Custom{!isPlus && ' ★'}
        </button>
      </div>
    );
  }

  return (
    <div className="speed-setting bottom-border">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label htmlFor={name} style={{ display: 'flex', alignItems: 'center' }}>{label}</label>
          {info || null}
        </div>

        <button className="current-speed" onClick={ () => setIsOpen(!isOpen) }>
          { value }x
          <svg 
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            className="chevron-icon"
            style={{ transform: `rotate(${isOpen ? 180 : 0}deg)` }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>

      <CSSTransition in={isOpen} timeout={300} classNames="opacity-transition" className="speed-transition">
        <div>
          {selector}
        </div>
      </CSSTransition>

    </div>
  );
};

export default SpeedSetting;
