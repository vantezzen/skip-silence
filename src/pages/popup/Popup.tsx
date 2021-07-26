import React, { ChangeEvent, Component } from 'react';
import { Power, Play, FastForward, BarChart2, Volume2, Columns, Volume, Circle, PieChart, Speaker, Info, Loader, Clock } from 'react-feather';
import { CSSTransition } from 'react-transition-group';
import { browser } from 'webextension-polyfill-ts';
import './Popup.scss';
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
import Alert from '../shared/components/alert';
import verifyLicense from '../shared/license';
import PlusInfo from './components/plusInfo';
import HelpModal from './components/helpModal';

import { formatTimelength } from '../shared/utils';
import trackEvent, { setupAnalytics } from '../shared/analytics';
import V4Info from './components/v4info';

const isChromium = navigator.userAgent.includes("Chrome");

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
      intro: "This bar will show you the current volume of the media you are playing.<br />If the volume is lower than the orange line, Skip Silence will speed up the video.<br />If the bar turns orange, the video is currently sped up.",
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
      intro: 'Use this slider to choose your silence threshold. This will also be represented by the orange line in the volume bar above.',
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
          setupAnalytics();
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
    trackEvent('show_plus_popup');

    this.setState({
      showPlusPopup: true,
    });
  }

  closePlusPopup() {
    trackEvent('close_plus_popup');

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
    const grayOutWhenDisabled = {
      opacity: this.config.get('enabled') ? 1 : 0.3,
      transition: 'all 0.3s',
    };

    return (
      <div>
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

              <V4Info />
        
              <div style={grayOutWhenDisabled}>
                <VUMeter config={this.config} />
              </div>

              <Switch
                name="enabled"
                label={(<><Power strokeWidth={3} style={{ width: 15 }} className="setting-icon" /> Enable Skip Silence</>)}
                config={this.config}
              />

              <div style={grayOutWhenDisabled}>
                <div id="speed-settings">
                  <SpeedSetting
                    label={(<><Play className="setting-icon" /> Playback Speed</>)}
                    name="playback_speed"
                    config={this.config}
                    isPlus={this.state.isPlus}
                    showPlusPopup={() => this.showPlusPopup()}
                    info={(
                      <HelpModal>
                        <h2>Playback Speed</h2>
                        <p>
                          Speed at which normal, non-silent parts of the media are played.
                        </p>
                      </HelpModal>
                    )}
                  />

                  <SpeedSetting
                    label={(<><FastForward className="setting-icon" /> Silence Speed</>)}
                    name="silence_speed"
                    config={this.config}
                    isPlus={this.state.isPlus}
                    showPlusPopup={() => this.showPlusPopup()}
                    info={(
                      <HelpModal>
                        <h2>Silence Speed</h2>
                        <p>
                          Speed at which "silent" parts of the media are played.
                        </p>
                      </HelpModal>
                    )}
                  />
                </div>

                <Switch
                  name="dynamic_silence_threshold"
                  label={(<><BarChart2 className="setting-icon" /> Use dynamic threshold{!this.state.isPlus ? ' ★' : ''} <div className="beta">beta<br />&nbsp;</div></>)}
                  config={this.config}
                  plusDisabled={!this.state.isPlus}
                  openPlusPopup={() => this.showPlusPopup()}
                  info={(
                    <HelpModal>
                      <h2>Use dynamic threshold</h2>
                      <p>
                        Dynamic threshold will try to automatically calculate the volume of the silence in your media.<br />
                        This way, you won't have to manually set the volume threshold for each video.
                      </p>
                    </HelpModal>
                  )}
                />

                <CSSTransition in={!this.config.get('dynamic_silence_threshold')} timeout={300} classNames="opacity-transition" className="speed-transition">
                  <SliderSetting
                    label={(<><Volume2 className="setting-icon" /> Volume Threshold</>)}
                    max={200}
                    name="silence_threshold"
                    config={this.config}
                    unit="%"
                    half
                    orange
                    info={(
                      <HelpModal>
                        <h2>Volume Threshold</h2>
                        <p>
                          If the volume is below this threshold, the video will be sped up.<br />
                          You can also see this threshold in the VU Meter above
                        </p>
                      </HelpModal>
                    )}
                  />
                </CSSTransition>

                <SliderSetting
                  label={(<><Columns className="setting-icon" /> Sample Threshold</>)}
                  max={50}
                  name="samples_threshold"
                  config={this.config}
                  unit=" samples"
                  half={false}
                  info={(
                    <HelpModal>
                      <h2>Sample Threshold</h2>
                      <p>
                        Length of silence needed before speeding up.<br />
                        This is to ensure we are not speeding up due to the short silence between words and sentences.
                      </p>
                    </HelpModal>
                  )}
                />

                <Switch
                  name="mute_silence"
                  label={(<><Volume className="setting-icon" /> Mute Silence{!this.state.isPlus ? ' ★' : ''}</>)}
                  config={this.config}
                  plusDisabled={!this.state.isPlus}
                  openPlusPopup={() => this.showPlusPopup()}
                  info={(
                    <HelpModal>
                      <h2>Mute Silence</h2>
                      <p>
                        If you are having problems with audio clicking or don't want to hear any audio when sped up, enable this option.
                      </p>
                    </HelpModal>
                  )}
                />

                {isChromium && (
                  <Switch
                    name="keep_audio_sync"
                    label={(<><Speaker className="setting-icon" /> Keep Audio in Sync{!this.state.isPlus ? ' ★' : ''}</>)}
                    config={this.config}
                    plusDisabled={!this.state.isPlus}
                    openPlusPopup={() => this.showPlusPopup()}
                    info={(
                      <HelpModal>
                        <h2>Keep Audio in Sync</h2>
                        <p>
                          Chrome and Browsers that base on Chromium (e.g. Edge) currently have a bug that will result in audio and video getting out of sync when changing the speed often.<br />
                          As "Skip Silence" will change the video speed often, you might experience this issue.<br />
                          When this setting is activated, Skip Silence will try to fix this issue by periodically putting them back into sync. <br />
                          Please note that this setting may cause media to re-buffer every 30s on some websites.
                        </p>
                      </HelpModal>
                    )}
                  />
                )}

                {(this.config.get('use_preload') && this.config.get('enabled') && !this.config.get('has_preloaded_current_page')) && (
                  <Alert>
                    <p>
                      Preloader is not yet attached on this page. Please refresh the page to enable it! 
                    </p>
                  </Alert>
                )}
                {(!this.config.get('use_preload') && this.config.get('has_preloaded_current_page')) && (
                  <Alert>
                    <p>
                      Preloader is still attached on this page. Please refresh the page to disable it!
                    </p>
                  </Alert>
                )}
                {(!this.config.get('can_use_preload')) && (
                  <Alert>
                    <p>
                      Unfortunately, preloader does not work on this page. Please disable it or try again on antoher page.
                    </p>
                  </Alert>
                )}

                <Switch
                  name="use_preload"
                  label={(<><Loader className="setting-icon" /> Preload media{!this.state.isPlus ? ' ★' : ''}</>)}
                  config={this.config}
                  plusDisabled={!this.state.isPlus}
                  openPlusPopup={() => this.showPlusPopup()}
                  info={(
                    <HelpModal>
                      <h2>Preload media</h2>
                      <p>
                        Skip Silence can preload the media to improve speeding up and down.<br />
                        Using the preloaded data, Skip Silence knows, how loud the media will be in 0.1-1s and better slow the media up and down.<br />
                        <br />
                        This features relies on the functionality of the site you are using and won't work on all pages!<br />
                        <br />
                        After changing this setting you will need to reload your current page, otherwise Skip Silence can't attach the preloader.
                      </p>
                    </HelpModal>
                  )}
                />

                <CSSTransition in={this.config.get('use_preload')} timeout={300} classNames="opacity-transition" className="opacity-transition">
                  <SliderSetting
                    label={(<><Clock className="setting-icon" /> Preload length</>)}
                    max={1}
                    min={0.1}
                    step={0.1}
                    name="preload_length"
                    config={this.config}
                    unit="s"
                    half={false}
                    orange
                    info={(
                      <HelpModal>
                        <h2>Preload length</h2>
                        <p>
                          Length of the preload time. For example, preload time of 0.5s results in the media being preloaded 0.5s into the future and the speed will be adjusted to the media 0.5s ahead of time.
                        </p>
                      </HelpModal>
                    )}
                  />
                </CSSTransition>

                <Switch
                  name="is_bar_icon_enabled"
                  label={(<><Circle className="setting-icon" /> Enable Command Bar Icon</>)}
                  config={this.config}
                  info={(
                    <HelpModal>
                      <h2>Enable Command Bar Icon</h2>
                      <p>
                        If you don't like the small command bar logo in the bottom right, you can completely disable it.<br />
                        You can still open the command bar using the shortcut "ALT/Option + Shift + S".
                      </p>
                    </HelpModal>
                  )}
                />

                <Switch
                  name="show_saved_time_info"
                  label={(<><Info className="setting-icon" /> Show saved time info</>)}
                  config={this.config}
                  info={(
                    <HelpModal>
                      <h2>Show saved time info</h2>
                      <p>
                        After a video or audio ended, "Skip Silence" will show a small info message in the bottom left corner, informing you how much time you have saved in this media alone.<br />
                        If you do not like this message, you can disable it.
                      </p>
                    </HelpModal>
                  )}
                />

                <Switch
                  name="allow_analytics"
                  label={(<><PieChart className="setting-icon" /> Allow anonymous analytics</>)}
                  config={this.config}
                  info={(
                    <HelpModal>
                      <h2>Allow anonymous analytics</h2>
                      <p>
                        "Skip Silence" uses <a href="https://simpleanalytics.com/">Simple Analytics</a> and Plausible to collect a few anonymized analytics without reducing your privacy.<br />
                        This data allows us to better understand how users use our extension and how we can improve it.<br />
                        We understand that some people do not like sending anonymized analytics, so you can completely opt-out of this!
                      </p>
                    </HelpModal>
                  )}
                />
              </div>
            </>
          )}
          
        </div>

        <div className="plugin-info">
          Using this extension you saved <b>{formatTimelength(this.config.get("saved_time"))}</b>
          <br />(MM:SS) of your time.<br />
          <br />

          Developed by <a href="https://github.com/vantezzen" target="_blank" className="yellow">vantezzen</a>.

          <div className="coffee">
          <a href="https://www.buymeacoffee.com/vantezzen" target="_blank" onClick={() => {trackEvent('coffee')}}>
            <img src="assets/img/bmc.png" alt="Buy Me A Coffee" width="150" />
          </a>
          </div>

          <a href="#" onClick={() => {trackEvent('reshow_training');this.setState({ shouldShowIntro: true })}}>
            Show the training screen again
          </a>
        </div>
      </div>
    );
  }
}

export default Popup;
