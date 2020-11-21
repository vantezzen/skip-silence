/**
 * Command Listener: Listenes for keyboard commands
 */
import React, { Component } from 'react';
import SliderSetting from '../../../shared/components/sliderSetting';
import SpeedSetting from '../../../shared/components/speedSetting';
import defaultConfig from '../../../shared/config';
import ConfigProvider from '../../../shared/configProvider';
import speedSettings from '../../../shared/speedSettings';

export const KEYS = {
  'ARROW_LEFT': 'ArrowLeft',
  'ARROW_UP': 'ArrowUp',
  'ARROW_RIGHT': 'ArrowRight',
  'ARROW_DOWN': 'ArrowDown',

  'SHIFT': 'Shift',
  'SPACE': ' ',
};

const IDLE_TEXT = 'Listening for commands...';

interface CommandListenerProps {
  config: ConfigProvider
}

class CommandListener extends Component<CommandListenerProps> {
  // State
  isShiftPressed = false;
  state = {
    text: IDLE_TEXT,
  };

  constructor(props : CommandListenerProps) {
    super(props);

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  // Attach a global key listener when mounting/unmounting
  componentDidMount() {
    window.document.addEventListener('keydown', this._onKeyDown);
    window.document.addEventListener('keyup', this._onKeyUp);
    window.document.getElementById('skip-silence-bar')?.focus();
  }
  componentWillUnmount() {
    window.document.removeEventListener('keydown', this._onKeyDown);
    window.document.removeEventListener('keyup', this._onKeyUp);
  }

  _setHighlighted(name : keyof typeof defaultConfig) {
    this.props.config.set('highlighted_component', name);

    // Remove highlighted element after 5 seconds
    setTimeout(() => {
      if (this.props.config.get('highlighted_component') === name) {
        this.props.config.set('highlighted_component', '');
      }
    }, 5000);
  }

  _setText(text : String) {
    this.setState({
      text,
    });

    // Remove text after 3 seconds
    setTimeout(() => {
      if (this.state.text === text) {
        this.setState({
          text: IDLE_TEXT,
        });
      }
    }, 3000);
  }

  _modifySpeed(name : 'playback_speed' | 'silence_speed', config : ConfigProvider, down = false) {
    const currentSpeed = config.get(name);

    const currentSpeedIndex = speedSettings.findIndex((speed) => currentSpeed === speed) || 2;
    
    // Increase or decrease the speed
    const newSpeedIndex = down ? currentSpeedIndex - 1 : currentSpeedIndex + 1;
    const newSpeed = speedSettings[newSpeedIndex] || currentSpeed;
    
    // Update our speed
    config.set(name, newSpeed);

    this._setHighlighted(name);
  }

  // Handle global key pressing and releasing
  _onKeyDown(event : KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();

    const { key } = event;
    const { config } = this.props;

    switch (key) {
      case KEYS.SHIFT:
        this.isShiftPressed = true;
        this._setHighlighted('silence_speed');
        this._setText('Shift: Modify Silence Speed');
        break;
      case KEYS.ARROW_UP:
        // Increase Speed
        const keyName = this.isShiftPressed ? 'silence_speed' : 'playback_speed';
        this._modifySpeed(keyName, config);
        this._setText('Arrow Up: Increased speed');
        break;
      case KEYS.ARROW_DOWN:
        // Decrease Speed
        const keyNameDown = this.isShiftPressed ? 'silence_speed' : 'playback_speed';
        this._modifySpeed(keyNameDown, config, true);
        this._setText('Arrow Down: Decreased speed');
        break;
      case KEYS.ARROW_RIGHT:
        // Increase Volume Threshold
        let thresholdUp = config.get('silence_threshold');
        if (thresholdUp <= 190) {
          thresholdUp += 10;
        }
        config.set('silence_threshold', thresholdUp);
        config.set('highlighted_component', 'silence_threshold');
        this._setHighlighted('silence_threshold');
        this._setText('Arrow Right: Increased threshold');
        break;
      case KEYS.ARROW_LEFT:
        // Decrease Volume Threshold
        let thresholdDown = config.get('silence_threshold');
        if (thresholdDown > 10) {
          thresholdDown -= 10;
        }
        config.set('silence_threshold', thresholdDown);
        this._setHighlighted('silence_threshold');
        this._setText('Arrow Left: Decreased threshold');
        break;
    }
  }
  _onKeyUp(event : KeyboardEvent) {
    const { key } = event;

    switch (key) {
      case KEYS.SHIFT:
        this.isShiftPressed = false;
        this.props.config.set('highlighted_component', 'playback_speed')
        this._setText('Unshift: Modify Playback Speed');
        break;
    }
  }

  render() {
    let highlightedComponent = <></>;
    const highlight = this.props.config.get('highlighted_component');

    if (highlight === 'silence_speed') {
      highlightedComponent = (
        <SpeedSetting
          label="Silence Speed"
          name="silence_speed"
          config={this.props.config}
        />
      );
    } else if (highlight === 'playback_speed') {
      highlightedComponent = (
        <SpeedSetting
          label="Playback Speed"
          name="playback_speed"
          config={this.props.config}
        />
      );
    } else if (highlight === 'silence_threshold') {
      highlightedComponent = (
        <SliderSetting
          label="Volume Threshold"
          max={200}
          name="silence_threshold"
          config={this.props.config}
          unit="%"
          half
        />
      );
    }

    return (
      <>
        {highlightedComponent}
        <p style={{ color: 'rgb(148 148 148)' }}>
          {this.state.text}
        </p>
        {this.state.text === IDLE_TEXT && (
          <p style={{ color: 'rgb(86 86 86)', marginLeft: 10 }}>
            Are you new to commands? <a href="https://github.com/vantezzen/skip-silence/blob/master/Command-Bar.md" target="_blank" className="info">Learn about them</a>
          </p>
        )}
      </>
    );
  }
}

export default CommandListener;