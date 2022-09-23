import { StateEnvironment } from "@vantezzen/plasmo-state"
import React from "react"
import { CSSTransition } from "react-transition-group"

import type { TabState } from "~shared/state"

import speedSettings from "../speedSettings"
import "./speedSetting.scss"

interface SpeedSettingProps {
  label: String | React.ReactNode
  name: "playback_speed" | "silence_speed"
  config: TabState
  isPlus?: boolean
  showPlusPopup?: () => void
  info?: React.ReactNode
}

type IsCustomKeys = "silence_speed_is_custom" | "playback_speed_is_custom"

const SpeedSetting = ({
  label,
  name,
  config,
  isPlus,
  showPlusPopup,
  info
}: SpeedSettingProps) => {
  const value = config.current[name] as number
  const isCustomValue = config.current[`${name}_is_custom` as IsCustomKeys]
  const [isOpen, setIsOpen] = React.useState(false)

  let selector
  if (isCustomValue) {
    // Selector is an input field
    selector = (
      <div className="custom-value-container">
        <input
          type="number"
          value={value}
          onChange={(evt) => {
            config.current[name] = parseInt(evt.target.value)

            if (config.environment === StateEnvironment.Popup) {
              window.sa_event(`speed_${name}_custom_${evt.target.value}`)
              window.plausible("speed_custom", {
                props: { name, speed: evt.target.value }
              })
            }
          }}
          step={0.1}
          min={0.0625}
          max={16}
        />
        <button
          onClick={() => {
            config.current[`${name}_is_custom` as IsCustomKeys] = false

            if (config.environment === StateEnvironment.Popup) {
              window.sa_event(`speed_${name}_dropdown`)
              window.plausible("speed_use_dropdown")
            }

            // Find nearest speed setting to the current one
            let nearestSetting = 1
            for (const setting of speedSettings) {
              if (
                Math.abs(value - setting) < Math.abs(value - nearestSetting)
              ) {
                nearestSetting = setting
              }
            }

            config.current[name] = Number(nearestSetting)
          }}>
          Dropdown
        </button>
      </div>
    )
  } else {
    selector = (
      <select
        name={name}
        id={name}
        onChange={(evt) => {
          if (evt.target.value === "custom") {
            if (isPlus) {
              config.current[`${name}_is_custom` as IsCustomKeys] = true
            } else if (showPlusPopup) {
              showPlusPopup()
            }
          } else {
            config.current[name] = parseInt(evt.target.value)
          }
          if (config.environment === StateEnvironment.Popup) {
            window.sa_event(`speed_${name}_dropdown_${evt.target.value}`)
            window.plausible("speed_dropdown", {
              props: { name, speed: evt.target.value }
            })
          }
        }}
        value={value}>
        {speedSettings.map((val) => (
          <option value={val} key={val}>
            {val}x
          </option>
        ))}
        <option value="custom">Custom{!isPlus && " ★"}</option>
      </select>
    )

    selector = (
      <div className="selector-container">
        {speedSettings.map((val) => (
          <button
            className={`value-option ${val === value ? "active" : ""}`}
            onClick={() => {
              config.current[name] = Number(val)
              window.sa_event(`speed_${name}_dropdown_${val}`)
              window.plausible("speed_dropdown", {
                props: { name, speed: val }
              })
            }}
            key={val}>
            {val}x
          </button>
        ))}

        {/* CUstom value option */}
        <button
          className="value-option value-custom"
          onClick={() => {
            if (isPlus) {
              config.current[`${name}_is_custom` as IsCustomKeys] = true
            } else if (showPlusPopup) {
              showPlusPopup()
            }

            window.sa_event(`speed_${name}_dropdown_custom`)
            window.plausible("speed_dropdown", {
              props: { name, speed: "custom" }
            })
          }}>
          Custom{!isPlus && " ★"}
        </button>
      </div>
    )
  }

  return (
    <div className="speed-setting bottom-border">
      <div className="info-container">
        <div className="label-container">
          <label htmlFor={name}>{label}</label>
          {info || null}
        </div>

        <button className="current-speed" onClick={() => setIsOpen(!isOpen)}>
          {value}x
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="chevron-icon"
            style={{ transform: `rotate(${isOpen ? 180 : 0}deg)` }}>
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>

      <CSSTransition
        in={isOpen}
        timeout={300}
        classNames="opacity-transition"
        className="opacity-transition selector">
        <div>{selector}</div>
      </CSSTransition>
    </div>
  )
}

export default SpeedSetting
