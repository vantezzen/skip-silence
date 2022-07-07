import React, { useEffect } from "react"
import { useState } from "react"
import browser from "webextension-polyfill"

import trackEvent from "../../shared/analytics"
import verifyLicense from "../../shared/license"
import "./v4info.scss"

const v4Info = () => {
  const [show, setShow] = useState(true)

  useEffect(() => {
    if (
      localStorage.hasShownv4Info === "yes" ||
      localStorage.hasShownIntro !== "yes"
    ) {
      setShow(false)
    }
    localStorage.hasShownv4Info = "yes"
  }, [])

  if (!show) {
    return null
  }

  return (
    <div className="v4-info">
      <h2>Welcome to Skip Silence 4!</h2>

      <p>
        Since your last visit a lot has changed!
        <br />I hope you like the new Skip Silence - you can find out more about
        the update on{" "}
        <a href="https://github.com/vantezzen/skip-silence/releases/tag/4.0.0">
          https://github.com/vantezzen/skip-silence/releases/tag/4.0.0
        </a>
      </p>
    </div>
  )
}

export default v4Info
