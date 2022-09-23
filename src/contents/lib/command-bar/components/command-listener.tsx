/**
 * Command Listener: Listenes for keyboard commands
 */
import React, { Component } from "react"

import __ from "~shared/i18n"
import speedSettings from "~shared/speedSettings"
import type { StateKey, TabState } from "~shared/state"

export const KEYS = {
  ARROW_LEFT: "ArrowLeft",
  ARROW_UP: "ArrowUp",
  ARROW_RIGHT: "ArrowRight",
  ARROW_DOWN: "ArrowDown",

  SHIFT: "Shift",
  SPACE: " "
}

const settingNames = {
  playback_speed: __("playbackSpeed"),
  silence_speed: __("silenceSpeed"),
  silence_threshold: __("volumeThreshold")
}

const IDLE_TEXT = __("commandBarListening")

interface CommandListenerProps {
  config: TabState
}

class CommandListener extends Component<CommandListenerProps> {
  // State
  isShiftPressed = false
  state = {
    text: IDLE_TEXT
  }

  constructor(props: CommandListenerProps) {
    super(props)

    this._onKeyDown = this._onKeyDown.bind(this)
    this._onKeyUp = this._onKeyUp.bind(this)
  }

  // Attach a global key listener when mounting/unmounting
  componentDidMount() {
    window.document.addEventListener("keydown", this._onKeyDown)
    window.document.addEventListener("keyup", this._onKeyUp)
    window.document.getElementById("skip-silence-bar")?.focus()
  }
  componentWillUnmount() {
    window.document.removeEventListener("keydown", this._onKeyDown)
    window.document.removeEventListener("keyup", this._onKeyUp)
  }

  _setHighlighted(name: StateKey) {
    this.props.config.current.highlighted_component = name

    // Remove highlighted element after 5 seconds
    setTimeout(() => {
      if (this.props.config.current.highlighted_component === name) {
        this.props.config.current.highlighted_component = ""
      }
    }, 5000)
  }

  _setText(text: String) {
    this.setState({
      text
    })

    // Remove text after 3 seconds
    setTimeout(() => {
      if (this.state.text === text) {
        this.setState({
          text: IDLE_TEXT
        })
      }
    }, 3000)
  }

  _modifySpeed(
    name: "playback_speed" | "silence_speed",
    config: TabState,
    down = false
  ) {
    const currentSpeed = config.current[name]

    const currentSpeedIndex =
      speedSettings.findIndex((speed) => currentSpeed === speed) || 2

    // Increase or decrease the speed
    const newSpeedIndex = down ? currentSpeedIndex - 1 : currentSpeedIndex + 1
    const newSpeed = speedSettings[newSpeedIndex] || currentSpeed

    // Update our speed
    config.current[name] = newSpeed

    this._setHighlighted(name)
  }

  // Handle global key pressing and releasing
  _onKeyDown(event: KeyboardEvent) {
    event.preventDefault()
    event.stopPropagation()

    const { key } = event
    const { config } = this.props

    switch (key) {
      case KEYS.SHIFT:
        this.isShiftPressed = true
        this._setHighlighted("silence_speed")
        this._setText("Shift: Modify Silence Speed")
        break
      case KEYS.ARROW_UP:
        // Increase Speed
        const keyName = this.isShiftPressed ? "silence_speed" : "playback_speed"
        this._modifySpeed(keyName, config)
        this._setText("Arrow Up: Increased speed")
        break
      case KEYS.ARROW_DOWN:
        // Decrease Speed
        const keyNameDown = this.isShiftPressed
          ? "silence_speed"
          : "playback_speed"
        this._modifySpeed(keyNameDown, config, true)
        this._setText("Arrow Down: Decreased speed")
        break
      case KEYS.ARROW_RIGHT:
        // Increase Volume Threshold
        let thresholdUp = config.current.silence_threshold
        if (thresholdUp <= 190) {
          thresholdUp += 10
        }
        config.current.silence_threshold = thresholdUp
        config.current.highlighted_component = "silence_threshold"
        this._setHighlighted("silence_threshold")
        this._setText("Arrow Right: Increased threshold")
        break
      case KEYS.ARROW_LEFT:
        // Decrease Volume Threshold
        let thresholdDown = config.current.silence_threshold
        if (thresholdDown > 10) {
          thresholdDown -= 10
        }
        config.current.silence_threshold = thresholdDown
        this._setHighlighted("silence_threshold")
        this._setText("Arrow Left: Decreased threshold")
        break
    }
  }
  _onKeyUp(event: KeyboardEvent) {
    const { key } = event

    switch (key) {
      case KEYS.SHIFT:
        this.isShiftPressed = false
        this.props.config.current.highlighted_component = "playback_speed"
        this._setText("Unshift: Modify Playback Speed")
        break
    }
  }

  render() {
    const highlight = this.props.config.current.highlighted_component

    return (
      <div className="bar-text">
        {highlight && (
          <div style={{ marginRight: 10 }}>
            {settingNames[highlight as keyof typeof settingNames]}:{" "}
            {this.props.config.current[highlight]}
          </div>
        )}
        <p style={{ color: "rgb(148 148 148)" }}>{this.state.text}</p>
        {this.state.text === IDLE_TEXT && (
          <p style={{ color: "rgb(86 86 86)", marginLeft: 10 }}>
            {__("commandBarAreYouNew")}{" "}
            <a
              href="https://github.com/vantezzen/skip-silence/blob/master/Command-Bar.md"
              target="_blank"
              className="info">
              {__("commandBarLearn")}
            </a>
          </p>
        )}
      </div>
    )
  }
}

export default CommandListener
