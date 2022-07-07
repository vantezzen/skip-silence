import icon from "data-base64:~assets/icon512.png"
import React from "react"

import __ from "../../shared/i18n"
import "./header.scss"

const Header = () => {
  return (
    <div className="header">
      <img src={icon} />
      <h1>{__("extensionName")} 5</h1>
    </div>
  )
}

export default Header
