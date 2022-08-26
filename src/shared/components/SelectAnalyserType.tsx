import React from "react"
import { Check, Search } from "react-feather"
import Browser from "webextension-polyfill"

import HelpModal from "~popup/components/helpModal"
import __ from "~shared/i18n"
import { supportsTabCapture } from "~shared/platform"
import type { TabState } from "~shared/state"

import "./SelectAnalyserType.scss"

function SelectAnalyserType({
  config,
  isSecureContext
}: {
  config: TabState
  isSecureContext: boolean
}) {
  return (
    <div className={`analyser-setting`}>
      <div className="setting-info">
        <label htmlFor="analyservalue" className="analyser-label">
          <Search className="setting-icon" /> {__("analyzerType")}
          <HelpModal>
            <h2>{__("analyzerType")}</h2>
            <p>{__("analyzerTypeHelp")}</p>

            <table className="analyzer-table">
              <thead>
                <tr>
                  <th></th>
                  <th>{__("analyzerTypeElement").replace(/- /g, "\n")}</th>
                  <th>{__("analyzerTypeDisplayMedia").replace(/- /g, "\n")}</th>
                  <th>{__("analyzerTypeTabCapture").replace(/- /g, "\n")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    Supports
                    <br />
                    Fullscreen
                    <br />
                    View
                  </td>
                  <td>
                    <Check strokeWidth={4} size={20} />
                  </td>
                  <td>
                    <Check strokeWidth={4} size={20} />
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    Works
                    <br />
                    on
                    <br />
                    almost
                    <br />
                    all
                    <br />
                    pages
                  </td>
                  <td></td>
                  <td></td>

                  <td>
                    <Check strokeWidth={4} size={20} />
                  </td>
                </tr>
                <tr>
                  <td>
                    Supports
                    <br />
                    Insecure
                    <br />
                    Pages
                  </td>
                  <td>
                    <Check strokeWidth={4} size={20} />
                  </td>
                  <td></td>
                  <td>
                    <Check strokeWidth={4} size={20} />
                  </td>
                </tr>
                <tr>
                  <td>
                    Supports
                    <br />
                    Firefox
                  </td>
                  <td>
                    <Check strokeWidth={4} size={20} />
                  </td>
                  <td>
                    <Check strokeWidth={4} size={20} />
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </HelpModal>
        </label>
      </div>
      <select
        className="analyser-select"
        value={config.current.analyserType}
        onChange={(e) => {
          // @ts-ignore
          config.current.analyserType = e.target.value

          const confirmed = window.confirm(__("analyzerTypeReload"))
          if (confirmed) {
            Browser.tabs.reload()
          }
        }}>
        {supportsTabCapture && (
          <option value="tabCapture">
            {__("analyzerTypeTabCapture")} ({__("analyzerTypeDefault")})
          </option>
        )}
        <option value="element">
          {__("analyzerTypeElement")}{" "}
          {!supportsTabCapture && <>({__("analyzerTypeDefault")})</>}
        </option>
        {isSecureContext && (
          <option value="displayMedia">{__("analyzerTypeDisplayMedia")}</option>
        )}
      </select>
    </div>
  )
}

export default SelectAnalyserType
