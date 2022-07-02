import React, { ChangeEvent, Component } from 'react';
import {
  Power,
  Play,
  FastForward,
  BarChart2,
  Volume2,
  Columns,
  Volume,
  Circle,
  PieChart,
  Speaker,
  Info,
  Loader,
  Clock,
  AlertTriangle,
} from 'react-feather';
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
import __ from '../shared/i18n';

const isChromium = navigator.userAgent.includes('Chrome');

class Popup extends Component {
  config?: ConfigProvider;
  isComponentMounted = false;

  state = {
    shouldShowIntro: localStorage.getItem('hasShownIntro') !== 'yes',
    isLocalPlayer: false,
    isPlus: false,
    showPlusPopup: false,
  };

  steps = [
    {
      element: '.header',
      intro: __('introHeader'),
    },
    {
      element: '#vu_meter',
      intro: __('introVuMeter'),
    },
    {
      element: '#enabled',
      intro: __('introEnabled'),
    },
    {
      element: '#speed-settings',
      intro: __('introSpeed'),
    },
    {
      element: '#silence_threshold',
      intro: __('introSilenceThreshold'),
    },
    {
      element: '#mute_silence',
      intro: __('introMuteSilence'),
    },
  ];

  constructor(props: object) {
    super(props);

    // Check if we are on a local player
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0] && tabs[0].url) {
        this.setupConfigProvider(tabs[0].id!);
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

  private setupConfigProvider(tabId: number) {
    let initialUpdate = true;
    this.config = new ConfigProvider('popup', tabId);
    this.forceUpdate();
    this.config.onUpdate(() => {
      if (this.isComponentMounted) {
        this.forceUpdate();
      }
      if (initialUpdate) {
        initialUpdate = false;

        if (
          this.config!.get('allow_analytics') &&
          !document.getElementById('simpleanalytics')
        ) {
          setupAnalytics();
        }
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

  async requestReload() {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tabs[0] || !tabs[0].id) {
      // We can't connect to a page
      return;
    }

    await browser.tabs.sendMessage(tabs[0].id, {
      command: 'reload',
    });

    window.close();
  }

  render() {
    if (!this.config) {
      return null;
    }

    const grayOutWhenDisabled = {
      opacity: this.config.get('enabled') ? 1 : 0.3,
      transition: 'all 0.3s',
    };

    return (
      <div>
        <div className="App">
          {this.state.showPlusPopup && (
            <PlusInfo
              onClose={() => this.closePlusPopup()}
              triggerValidation={() => this.checkPlusStatus()}
            />
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
                label={
                  <>
                    <Power
                      strokeWidth={3}
                      style={{ width: 15 }}
                      className="setting-icon"
                    />{' '}
                    {__('enable')}
                  </>
                }
                config={this.config}
              />

              <div style={grayOutWhenDisabled}>
                <div id="speed-settings">
                  <SpeedSetting
                    label={
                      <>
                        <Play className="setting-icon" /> {__('playbackSpeed')}
                      </>
                    }
                    name="playback_speed"
                    config={this.config}
                    isPlus={this.state.isPlus}
                    showPlusPopup={() => this.showPlusPopup()}
                    info={
                      <HelpModal>
                        <h2>{__('playbackSpeed')}</h2>
                        <p>{__('playbackSpeedHelp')}</p>
                      </HelpModal>
                    }
                  />

                  <SpeedSetting
                    label={
                      <>
                        <FastForward className="setting-icon" />{' '}
                        {__('silenceSpeed')}
                      </>
                    }
                    name="silence_speed"
                    config={this.config}
                    isPlus={this.state.isPlus}
                    showPlusPopup={() => this.showPlusPopup()}
                    info={
                      <HelpModal>
                        <h2>{__('silenceSpeed')}</h2>
                        <p>{__('silenceSpeedHelp')}</p>
                      </HelpModal>
                    }
                  />
                </div>

                <Switch
                  name="dynamic_silence_threshold"
                  label={
                    <>
                      <BarChart2 className="setting-icon" />{' '}
                      {__('useDynamicThreshold')}
                      {!this.state.isPlus ? ' ★' : ''}{' '}
                      <div className="beta">
                        beta
                        <br />
                        &nbsp;
                      </div>
                    </>
                  }
                  config={this.config}
                  plusDisabled={!this.state.isPlus}
                  openPlusPopup={() => this.showPlusPopup()}
                  info={
                    <HelpModal>
                      <h2>{__('useDynamicThreshold')}</h2>
                      <p>{__('useDynamicThresholdHelp')}</p>
                    </HelpModal>
                  }
                />

                <CSSTransition
                  in={!this.config.get('dynamic_silence_threshold')}
                  timeout={300}
                  classNames="opacity-transition"
                  className="speed-transition"
                >
                  <SliderSetting
                    label={
                      <>
                        <Volume2 className="setting-icon" />{' '}
                        {__('volumeThreshold')}
                      </>
                    }
                    max={200}
                    name="silence_threshold"
                    config={this.config}
                    unit="%"
                    half
                    orange
                    info={
                      <HelpModal>
                        <h2>{__('volumeThreshold')}</h2>
                        <p>{__('volumeThresholdHelp')}</p>
                      </HelpModal>
                    }
                  />
                </CSSTransition>

                <SliderSetting
                  label={
                    <>
                      <Columns className="setting-icon" />{' '}
                      {__('sampleThreshold')}
                    </>
                  }
                  max={50}
                  name="samples_threshold"
                  config={this.config}
                  unit=" samples"
                  half={false}
                  info={
                    <HelpModal>
                      <h2>{__('sampleThreshold')}</h2>
                      <p>{__('sampleThresholdHelp')}</p>
                    </HelpModal>
                  }
                />

                <Switch
                  name="mute_silence"
                  label={
                    <>
                      <Volume className="setting-icon" /> {__('muteSilence')}
                      {!this.state.isPlus ? ' ★' : ''}
                    </>
                  }
                  config={this.config}
                  plusDisabled={!this.state.isPlus}
                  openPlusPopup={() => this.showPlusPopup()}
                  info={
                    <HelpModal>
                      <h2>{__('muteSilence')}</h2>
                      <p>{__('muteSilenceHelp')}</p>
                    </HelpModal>
                  }
                />

                {isChromium && (
                  <Switch
                    name="keep_audio_sync"
                    label={
                      <>
                        <Speaker className="setting-icon" />{' '}
                        {__('keepAudioInSync')}
                        {!this.state.isPlus ? ' ★' : ''}
                      </>
                    }
                    config={this.config}
                    plusDisabled={!this.state.isPlus}
                    openPlusPopup={() => this.showPlusPopup()}
                    info={
                      <HelpModal>
                        <h2>{__('keepAudioInSync')}</h2>
                        <p>{__('keepAudioInSyncHelp')}</p>
                      </HelpModal>
                    }
                  />
                )}

                {this.config.get('use_preload') &&
                  this.config.get('enabled') &&
                  !this.config.get('has_preloaded_current_page') && (
                    <Alert>
                      <p>
                        Preloader is not yet attached on this page. Please{' '}
                        <a href="#" onClick={() => this.requestReload()}>
                          refresh the page
                        </a>{' '}
                        to enable it!
                      </p>
                    </Alert>
                  )}
                {!this.config.get('use_preload') &&
                  this.config.get('has_preloaded_current_page') && (
                    <Alert>
                      <p>
                        Preloader is still attached on this page. Please{' '}
                        <a href="#" onClick={() => this.requestReload()}>
                          refresh the page
                        </a>{' '}
                        to disable it!
                      </p>
                    </Alert>
                  )}
                {!this.config.get('can_use_preload') && (
                  <Alert>
                    <p>
                      Unfortunately, preloader does not work on this page.
                      Please disable it or try again on antoher page.
                    </p>
                  </Alert>
                )}

                <Switch
                  name="use_preload"
                  label={
                    <>
                      <Loader className="setting-icon" /> {__('preloadMedia')}
                      {!this.state.isPlus ? ' ★' : ''}
                    </>
                  }
                  config={this.config}
                  plusDisabled={!this.state.isPlus}
                  openPlusPopup={() => this.showPlusPopup()}
                  info={
                    <HelpModal>
                      <h2>{__('preloadMedia')}</h2>
                      <p>{__('preloadMediaHelp')}</p>
                    </HelpModal>
                  }
                />

                <CSSTransition
                  in={this.config.get('use_preload')}
                  timeout={300}
                  classNames="opacity-transition"
                  className="opacity-transition"
                >
                  <SliderSetting
                    label={
                      <>
                        <Clock className="setting-icon" /> {__('preloadLength')}
                      </>
                    }
                    max={1}
                    min={0.1}
                    step={0.1}
                    name="preload_length"
                    config={this.config}
                    unit="s"
                    half={false}
                    orange
                    info={
                      <HelpModal>
                        <h2>{__('preloadLength')}</h2>
                        <p>{__('preloadLengthHelp')}</p>
                      </HelpModal>
                    }
                  />
                </CSSTransition>

                <Switch
                  name="is_bar_icon_enabled"
                  label={
                    <>
                      <Circle className="setting-icon" />{' '}
                      {__('enableCommandBarIcon')}
                    </>
                  }
                  config={this.config}
                  info={
                    <HelpModal>
                      <h2>{__('enableCommandBarIcon')}</h2>
                      <p>{__('enableCommandBarIconHelp')}</p>
                    </HelpModal>
                  }
                />

                <Switch
                  name="show_saved_time_info"
                  label={
                    <>
                      <Info className="setting-icon" />{' '}
                      {__('showSavedTimeInfo')}
                    </>
                  }
                  config={this.config}
                  info={
                    <HelpModal>
                      <h2>{__('showSavedTimeInfo')}</h2>
                      <p>{__('showSavedTimeInfoHelp')}</p>
                    </HelpModal>
                  }
                />

                <Switch
                  name="allow_analytics"
                  label={
                    <>
                      <PieChart className="setting-icon" />{' '}
                      {__('allowAnonymousAnalytics')}
                    </>
                  }
                  config={this.config}
                  info={
                    <HelpModal>
                      <h2>{__('allowAnonymousAnalytics')}</h2>
                      <p>{__('allowAnonymousAnalyticsHelp')}</p>
                    </HelpModal>
                  }
                />
              </div>
            </>
          )}
        </div>

        <div className="plugin-info">
          {__('savedTimeText', {
            time: formatTimelength(this.config.get('saved_time')),
          })}
          <br />
          <br />
          {__('developedBy')}{' '}
          <a
            href="https://github.com/vantezzen"
            target="_blank"
            className="yellow"
          >
            vantezzen
          </a>
          .
          <div className="coffee">
            <a
              href="https://www.buymeacoffee.com/vantezzen"
              target="_blank"
              onClick={() => {
                trackEvent('coffee');
              }}
            >
              <img src="assets/img/bmc.png" alt="Buy Me A Coffee" width="150" />
            </a>
          </div>
          <a
            href="#"
            onClick={() => {
              trackEvent('reshow_training');
              this.setState({ shouldShowIntro: true });
            }}
          >
            {__('showTheTrainingScreenAgain')}
          </a>
        </div>
      </div>
    );
  }
}

export default Popup;
