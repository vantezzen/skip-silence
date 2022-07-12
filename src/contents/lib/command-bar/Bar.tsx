import { usePlasmoState } from "@vantezzen/plasmo-state"
import icon from "data-base64:~assets/icon512.png"
import "fontsource-poppins"
import "fontsource-poppins/600.css"
import React, { Component } from "react"
import browser from "webextension-polyfill"

import type { TabState } from "~shared/state"

import CommandListener from "./components/command-listener"
import Header from "./components/header"

interface BarProps {
  config: TabState
}

const Bar = ({ config }: BarProps) => {
  usePlasmoState(config)

  const isEnabled = config.current.enabled
  const iconEnabled = config.current.is_bar_icon_enabled
  const isCollapsed = config.current.is_bar_collapsed

  if (!isEnabled || (isCollapsed && !iconEnabled)) return <></>

  if (isCollapsed) {
    // Show collapsed bar
    return (
      <div className="skip-silence-bar-collapsed">
        <img
          src={icon}
          style={{
            width: 25,
            height: 25
          }}
          onClick={() => {
            config.current.is_bar_collapsed = false
          }}
        />
      </div>
    )
  }

  return (
    <div className="skip-silence-bar">
      <CommandListener config={config} />

      <Header config={config} />
      {/* <CollapseBtn config={config} /> */}
    </div>
  )
}

export default Bar
