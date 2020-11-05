import React, { ChangeEvent, Component } from 'react';
import { browser } from 'webextension-polyfill-ts';
import './Popup.css';
import 'intro.js/introjs.css';

import { Steps } from 'intro.js-react';

import ConfigProvider from '../shared/configProvider';

import Header from './components/header';
import VUMeter from './components/vuMeter';
import MainSwitch from './components/mainSwitch';
import SliderSetting from './components/sliderSetting';
import SpeedSetting from './components/speedSetting';
import debug from '../shared/debug';
import LocalPlayerInfo from './components/localPlayerInfo';

class Popup extends Component {
  config : ConfigProvider;
  isComponentMounted = false;

  state = {
    shouldShowIntro: localStorage.getItem('hasShownIntro') !== 'yes',
    isLocalPlayer: false,
  }

  steps = [
    {
      element: '.header',
      intro: 'Welcome to Skip Silence! I can show you around, if you want to - otherwise click "Skip" at any point',
    },
    {
      element: '#vu_meter',
      intro: "This bar will show you the current volume of the media you are playing.<br />If the volume is lower than the red line, Skip Silence will speed up the video.<br />If the bar turns green, the video if currently sped up.",
    },
    {
      element: '.main-switch input',
      intro: 'Click this switch in order to enable or disable Skip Silence on the current page. If you disable Skip Silence you will not see the volume level above.',
    },
    {
      element: '#speed-settings',
      intro: 'You can choose what speed to play back normal parts ("Playback Speed") and silent parts ("Silence Speed") of the media.',
    },
    {
      element: '#silence_threshold',
      intro: 'Use this slider to choose your silence threshold. This will also be represented by the red line in the volume bar above.',
    },
  ];

  constructor(props : object) {
    super(props);

    this.onEnableDisable = this.onEnableDisable.bind(this);
    this.config = new ConfigProvider("popup");
    this.config.onUpdate(() => {
      if (this.isComponentMounted) {
        this.forceUpdate();
      }
    });

    // Check if we are on a local player
    browser.tabs.query({ active: true, lastFocusedWindow: true }).then(tabs => {
      if (tabs[0] && tabs[0].url) {
        const url = new URL(tabs[0].url);
    
        if (url.protocol === 'file:') {
          this.setState({
            isLocalPlayer: true,
          });
        }
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
        {this.state.isLocalPlayer ? (
          <LocalPlayerInfo />
        ) : (
          <>
            {this.state.shouldShowIntro && (
              <Steps
                initialStep={0}
                enabled={this.state.shouldShowIntro}
                steps={this.steps}
                onExit={() => {
                  this.setState({ shouldShowIntro: false });
                  localStorage.setItem('hasShownIntro', 'yes');
                }}
              />
            )}

            <Header />
      
            <VUMeter config={this.config} />

            <MainSwitch
              enabled={this.config.get('enabled')}
              onSwitch={this.onEnableDisable}
            />

            <div style={{
              display: 'flex',
              marginTop: '1.5rem'
            }} id="speed-settings">
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
          </>
        )}
        
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
