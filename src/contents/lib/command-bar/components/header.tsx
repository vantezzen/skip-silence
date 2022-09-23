import icon from "data-base64:~assets/icon512.png"
import React from "react"
import browser from "webextension-polyfill"

import type { TabState } from "~shared/state"

import "./header.scss"

const Header = ({ config }: { config: TabState }) => {
  return (
    <div className="header">
      <img
        src={icon}
        onClick={() => {
          config.current.is_bar_collapsed = !config.current.is_bar_collapsed
        }}
        style={{
          width: 25,
          height: 25,
          marginLeft: 10
        }}
      />
    </div>
  )
}

export default Header
