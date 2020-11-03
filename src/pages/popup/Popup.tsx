import React, { ChangeEvent, Component } from 'react';
import './Popup.css';

import ConfigProvider from '../shared/configProvider';

import Header from './components/header';
import VUMeter from './components/vuMeter';
import MainSwitch from './components/mainSwitch';
import SliderSetting from './components/sliderSetting';
import SpeedSetting from './components/speedSetting';
import debug from '../shared/debug';

class Popup extends Component {
  config : ConfigProvider;
  isComponentMounted = false;

  constructor(props : object) {
    super(props);

    this.onEnableDisable = this.onEnableDisable.bind(this);
    this.config = new ConfigProvider("popup");
    this.config.onUpdate(() => {
      if (this.isComponentMounted) {
        this.forceUpdate();
      }
    });
  }

  componentDidMount() {
    this.isComponentMounted = true;
  }

  componentWillUnmount() {
    this.isComponentMounted = false;
  }

  onEnableDisable(event : ChangeEvent<HTMLInputElement>) {
    this.config.set('enabled', event.target.checked);
  }

  render() {
    return (
      <div className="App">
        <Header />
  
        <VUMeter config={this.config} />

        <MainSwitch
          enabled={this.config.get('enabled')}
          onSwitch={this.onEnableDisable}
        />

        <div style={{
          display: 'flex',
          marginTop: '1.5rem'
        }}>
          <SpeedSetting
            label="Playback Speed"
            name="playback_speed"
            config={this.config}
          />
          <SpeedSetting
            label="Silence Speed"
            name="silence_speed"
            config={this.config}
          />
        </div>

        <SliderSetting
          label="Volume Threshold"
          max={200}
          name="silence_threshold"
          config={this.config}
          unit="%"
          half
        />
        <p className="small">
          If the volume is under the red line, the video will be sped up.
        </p>

        <SliderSetting
          label="Sample Threshold"
          max={50}
          name="samples_threshold"
          config={this.config}
          unit=" samples"
          half={false}
        />
        <p className="small">
          Length of silence needed before speeding up.<br />
          This is to ensure we are not speeding up due to the short silence between words and sentences.
        </p>

        <div className="plugin-info">
          Developed by <a href="https://github.com/vantezzen" target="_blank">Bennett</a>.<br />
          This extension is fully open-source. The code can be viewed at <a href="https://github.com/vantezzen/skip-silence">https://github.com/vantezzen/skip-silence</a>.<br />
          If you find any bugs or experience problems using the extension with a specific website, please feel free to report it at <a href="https://github.com/vantezzen/skip-silence/issues">https://github.com/vantezzen/skip-silence/issues</a>.
        </div>
      </div>
    );
  }
}

export default Popup;
