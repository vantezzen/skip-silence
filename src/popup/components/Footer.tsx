import bmcLogo from "data-base64:~assets/bmc.png"
import React from "react"

import trackEvent from "../../shared/analytics"
import __ from "../../shared/i18n"

function Footer({ triggerIntro }: { triggerIntro: () => void }) {
  return (
    <div className="plugin-info">
      {/* {__('savedTimeText', {
            time: formatTimelength(this.config.get('saved_time')),
          })}
          <br />
          <br /> */}
      {__("developedBy")}{" "}
      <a href="https://github.com/vantezzen" target="_blank" className="yellow">
        vantezzen
      </a>
      .
      <div className="coffee">
        <a
          href="https://www.buymeacoffee.com/vantezzen"
          target="_blank"
          onClick={() => {
            trackEvent("coffee")
          }}>
          <img src={bmcLogo} alt="Buy Me A Coffee" width="150" />
        </a>
      </div>
      <a
        href="#"
        onClick={() => {
          trackEvent("reshow_training")
          triggerIntro()
        }}>
        {__("showTheTrainingScreenAgain")}
      </a>
    </div>
  )
}

export default Footer
