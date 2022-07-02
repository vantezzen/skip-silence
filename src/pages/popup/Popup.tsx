import React, { ChangeEvent, Component } from 'react';
import { browser } from 'webextension-polyfill-ts';
import './Popup.scss';
import 'intro.js/introjs.css';

import { Steps } from 'intro.js-react';

import ConfigProvider, { getCurrentTabId } from '../shared/configProvider';

import Header from './components/header';
import VUMeter from '../shared/components/vuMeter';
import LocalPlayerInfo from '../shared/components/localPlayerInfo';
import verifyLicense from '../shared/license';
import PlusInfo from './components/plusInfo';

import trackEvent, { setupAnalytics } from '../shared/analytics';
import V4Info from './components/v4info';
import __ from '../shared/i18n';
import SettingsForm from './components/SettingsForm';
import Footer from './components/Footer';
import { introSteps } from './config';

class Popup extends Component {
  config?: ConfigProvider;
  isComponentMounted = false;

  state = {
    shouldShowIntro: localStorage.getItem('hasShownIntro') !== 'yes',
    isLocalPlayer: false,
    isPlus: false,
    showPlusPopup: false,
  };

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
                  steps={introSteps}
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

              <SettingsForm
                config={this.config}
                isPlus={this.state.isPlus}
                showPlusPopup={() => this.showPlusPopup()}
              />
            </>
          )}
        </div>

        <Footer triggerIntro={() => this.setState({ shouldShowIntro: true })} />
      </div>
    );
  }
}

export default Popup;
