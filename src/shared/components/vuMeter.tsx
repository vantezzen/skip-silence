import React, { Component } from "react"
import { Volume2 } from "react-feather"
import browser from "webextension-polyfill"

import type { TabState } from "~shared/state"

import type { ExtMessage } from "../types"
import "./vuMeter.scss"

interface VUMeterProps {
  config: TabState
}

/**
 * VU Meter Element to render the current volume information
 */
export default class VUMeter extends Component<VUMeterProps> {
  // Canvas variables
  canvasElement: HTMLCanvasElement | undefined
  canvasContext: CanvasRenderingContext2D | null | undefined

  // State variables
  volume = 0
  isSpedUp = false
  hasRequestedFrame = false

  constructor(props: VUMeterProps) {
    super(props)

    this._listenForVolume = this._listenForVolume.bind(this)
    this._renderMeter = this._renderMeter.bind(this)
    this._requestRender = this._requestRender.bind(this)
  }

  /**
   * Render our message listener to browser messages
   */
  componentDidMount() {
    browser.runtime.onMessage.addListener(this._listenForVolume)
  }

  /**
   * Handle browser messages to update the VU Meter
   *
   * @param msg Browser Message
   */
  _listenForVolume(msg: ExtMessage) {
    if (msg.command === "volume") {
      this.volume = msg.data
      this._requestRender()
    } else if (msg.command === "speedUp") {
      this.isSpedUp = true
      this._requestRender()
    } else if (msg.command === "slowDown") {
      this.isSpedUp = false
      this._requestRender()
    }
  }

  /**
   * Request our VU Meter to be rerendered if we haven't already
   */
  _requestRender() {
    if (!this.hasRequestedFrame) {
      this.hasRequestedFrame = true
      window.requestAnimationFrame(this._renderMeter)
    }
  }

  /**
   * Render our information to the VU Meter canvas element
   */
  _renderMeter() {
    this.hasRequestedFrame = false

    // Make sure our canvas is loaded
    if (!this.canvasContext || !this.canvasElement) return

    // Clear current contents
    this.canvasContext.clearRect(
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height
    )

    // VU Meter color changes based on if the video is currently sped up
    if (this.isSpedUp) {
      this.canvasContext.fillStyle = "#EEA861"
    } else {
      this.canvasContext.fillStyle = "#66CC99"
    }

    // Render VU Meter bar
    this.canvasContext.fillRect(
      0,
      0,
      Math.min(this.volume + 1, this.canvasElement.width - 60),
      this.canvasElement.height
    )

    // Render Threshold bar
    this.canvasContext.fillStyle = "#EEA861"
    this.canvasContext.fillRect(
      0 + this.props.config.current.silence_threshold,
      0,
      2,
      this.canvasElement.height
    )
  }

  render() {
    return (
      <div className="vu-meter">
        <div className="icon">
          <Volume2 className="setting-icon" />
        </div>

        <canvas
          id="vu_meter"
          ref={(el) => {
            // Save our canvas element and rerender
            if (!el) return

            this.canvasElement = el
            this.canvasContext = el.getContext("2d")

            this._requestRender()
          }}
        />
      </div>
    )
  }
}
