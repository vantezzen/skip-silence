import React, { ChangeEvent, Component } from 'react';
import { browser } from 'webextension-polyfill-ts';
import './Popup.css';
import 'intro.js/introjs.css';

import { Steps } from 'intro.js-react';

import ConfigProvider from '../shared/configProvider';

import Header from './components/header';
import VUMeter from '../shared/components/vuMeter';
import Switch from '../shared/components/switch';
import SliderSetting from '../shared/components/sliderSetting';
import SpeedSetting from '../shared/components/speedSetting';
import debug from '../shared/debug';
import LocalPlayerInfo from '../shared/components/localPlayerInfo';
import verifyLicense from '../shared/license';
import PlusInfo from './components/plusInfo';

class Popup extends Component {
  config : ConfigProvider;
  isComponentMounted = false;

  state = {
    shouldShowIntro: localStorage.getItem('hasShownIntro') !== 'yes',
    isLocalPlayer: false,
    isPlus: false,
    showPlusPopup: false,
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
      element: '#enabled',
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
    {
      element: '#mute_silence',
      intro: 'If you are having trouble with the audio "clicking" when speeding up or slowing down, try enabling this option.',
    },
  ];

  constructor(props : object) {
    super(props);

    let initialUpdate = true;
    this.config = new ConfigProvider("popup");
    this.config.onUpdate(() => {
      if (this.isComponentMounted) {
        this.forceUpdate();
      }
      if (initialUpdate) {
        initialUpdate = false;

        if (this.config.get('allow_analytics') && !document.getElementById('simpleanalytics')) {
          const sa = document.createElement('script');
          sa.src = "https://scripts.simpleanalyticscdn.com/latest.dev.js";
          sa.id = "simpleanalytics";
          sa.async = true;
          sa.defer = true;
          sa.setAttribute('data-collect-dnt', 'true');
          sa.setAttribute('data-hostname', 'skipsilence.analytics.vantezzen.io');
          document.body.appendChild(sa);

          const plausible = document.createElement('script');
          plausible.setAttribute('data-domain', 'skipsilence.a.vantezzen.io');
          plausible.async = true;
          plausible.defer = true;
          plausible.src = "https://a.vantezzen.io/js/plausible.js";
          document.body.appendChild(plausible);
        }
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
        window.sa_event(`open_${url.host}`);
        window.plausible('open', { props: { site: url.host } });
      }
    });
  }

  async checkPlusStatus() {
    const isValid = await verifyLicense();
    this.setState({
      isPlus: isValid,
    });
  }

  showPlusPopup() {
    window.sa_event('show_plus_popup');
    window.plausible('show_plus_popup');

    this.setState({
      showPlusPopup: true,
    });
  }

  closePlusPopup() {
    window.sa_event('close_plus_popup');
    window.plausible('close_plus_popup');

    this.setState({ showPlusPopup: false });
  }

  componentDidMount() {
    this.isComponentMounted = true;
    this.checkPlusStatus();
  }

  componentWillUnmount() {
    this.isComponentMounted = false;
  }

  render() {
    return (
      <div className="App">
        {(this.state.showPlusPopup) && (
          <PlusInfo onClose={() => this.closePlusPopup()} triggerValidation={() => this.checkPlusStatus()} />
        )}
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

            <Switch
              name="enabled"
              label="Enable Skip Silence"
              config={this.config}
            />

            <div style={{
              display: 'flex',
              marginTop: '1.5rem'
            }} id="speed-settings">
              <SpeedSetting
                label="Playback Speed"
                name="playback_speed"
                config={this.config}
                isPlus={this.state.isPlus}
                showPlusPopup={() => this.showPlusPopup()}
              />
              <SpeedSetting
                label="Silence Speed"
                name="silence_speed"
                config={this.config}
                isPlus={this.state.isPlus}
                showPlusPopup={() => this.showPlusPopup()}
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

            <Switch
              name="mute_silence"
              label={`Mute Silence${!this.state.isPlus ? ' ★' : ''}`}
              config={this.config}
              plusDisabled={!this.state.isPlus}
              openPlusPopup={() => this.showPlusPopup()}
            />
            <p className="small">
              If you are having problems with audio clicking or don't want to hear any audio when sped up, enable this option.
            </p>

            <Switch
              name="is_bar_icon_enabled"
              label="Enable Command Bar Icon"
              config={this.config}
            />
            <p className="small">
              If you don't like the small command bar logo in the bottom right, you can completely disable it.<br />
              You can still open the command bar using the shortcut "ALT/Option + Shift + S".
            </p>

            <Switch
              name="allow_analytics"
              label="Allow anonymous analytics"
              config={this.config}
            />
            <p className="small">
              "Skip Silence" uses <a href="https://simpleanalytics.com/">Simple Analytics</a> and Plausible to collect a few anonymized analytics without reducing your privacy.<br />
              This data allows us to better understand how users use our extension and how we can improve it.<br />
              We understand that some people do not like sending anonymized analytics, so you can completely opt-out of this!<br />
              You will need to close and re-open this popup after changing this setting in order for it to take effect.
            </p>
          </>
        )}
        
        <div className="plugin-info">
          Developed by <a href="https://github.com/vantezzen" target="_blank">vantezzen</a>.<br />
          <a href="https://www.buymeacoffee.com/vantezzen" target="_blank" onClick={() => {window.sa_event('coffee');window.plausible('coffee')}}>
            <img src="assets/img/bmc.png" alt="Buy Me A Coffee" width="150" />
          </a>
          <br />

          <a href="#" onClick={() => {window.sa_event('reshow_training');window.plausible('reshow_training');this.setState({ shouldShowIntro: true })}}>
            Show the training screen again
          </a>
        </div>
      </div>
    );
  }
}

export default Popup;
