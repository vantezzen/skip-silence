import React from "react"
import Browser from "webextension-polyfill"

import { supportsTabCapture } from "~shared/platform"
import type { TabState } from "~shared/state"

function SelectAnalyserType({ config }: { config: TabState }) {
  return (
    <div className={`analyser-setting`}>
      <div className="setting-info">
        <label htmlFor="analyservalue" className="analyser-label">
          Analyser Type
        </label>
      </div>
      <select
        className="analyser-select"
        value={config.current.analyserType}
        onChange={(e) => {
          // @ts-ignore
          config.current.analyserType = e.target.value

          const confirmed = window.confirm(
            "Changing analyser type requires reloading the page. Do you want to reload now?"
          )
          if (confirmed) {
            Browser.tabs.reload()
          }
        }}>
        <option value="element">Element</option>
        <option value="displayMedia">DisplayMedia</option>
        {supportsTabCapture && <option value="tabCapture">TabCapture</option>}
      </select>
    </div>
  )
}

export default SelectAnalyserType
