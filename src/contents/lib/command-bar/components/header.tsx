import React from "react"
import browser from "webextension-polyfill"

import ConfigProvider from "../../../shared/configProvider"
import "./header.scss"

const Header = ({ config }: { config: ConfigProvider }) => {
  return (
    <div className="header">
      <img
        src={browser.runtime.getURL("/assets/img/icon-128.png")}
        onClick={() => {
          config.set("is_bar_collapsed", !config.get("is_bar_collapsed"))
        }}
        style={{
          width: 25,
          height: 25
        }}
      />
    </div>
  )
}

export default Header
