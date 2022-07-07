import { StateEnvironment } from "@vantezzen/plasmo-state"
import React, { ChangeEvent } from "react"

import type { StateKey, TabState } from "~shared/state"

import "./switch.scss"

interface SwitchProps {
  label: string | React.ReactNode
  name: StateKey
  config: TabState
  plusDisabled?: boolean
  openPlusPopup?: () => void
  info?: React.ReactNode
}

const Switch = ({
  label,
  name,
  config,
  plusDisabled,
  openPlusPopup,
  info
}: SwitchProps) => {
  return (
    <div className="switch bottom-border">
      <div className="label-container">
        <label htmlFor={name}>{label}</label>
        {info || null}
      </div>

      <div>
        {name === "enabled" && !config.current[name] && (
          <div className="switch-ping" />
        )}

        <input
          id={name}
          type="checkbox"
          className="switch"
          checked={config.current[name] as boolean}
          onChange={(evt) => {
            if (plusDisabled) {
              if (openPlusPopup) {
                openPlusPopup()
              }
              return
            }

            // @ts-ignore
            config.current[name] = evt.target.checked

            if (config.environment === StateEnvironment.Popup) {
              window.sa_event(
                `setting_${name}_${evt.target.checked ? "enable" : "disable"}`
              )
              window.plausible("setting_change", {
                props: {
                  type: `${name}:${evt.target.checked ? "enable" : "disable"}`
                }
              })
            }

            if (name === "allow_analytics") {
              setTimeout(() => {
                window.location.reload()
              }, 250)
            }
          }}
        />
      </div>
    </div>
  )
}

export default Switch
