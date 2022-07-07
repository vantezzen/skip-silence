import React from "react"
import { X } from "react-feather"
import browser from "webextension-polyfill"

import type { TabState } from "~shared/state"

import "./collapse-btn.scss"

interface CollapseBtnProps {
  config: TabState
}

const CollapseBtn = ({ config }: CollapseBtnProps) => {
  return (
    <div className="collapse-btn">
      <X
        onClick={() => {
          config.current.is_bar_collapsed = !config.current.is_bar_collapsed
        }}
      />
    </div>
  )
}

export default CollapseBtn
