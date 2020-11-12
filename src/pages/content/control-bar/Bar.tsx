import React, { Component } from 'react';
import { browser } from 'webextension-polyfill-ts';

import 'fontsource-poppins';
import 'fontsource-poppins/600.css';

import ConfigProvider from '../../shared/configProvider';
import SpeedSetting from '../../shared/components/speedSetting';
import Switch from '../../shared/components/switch';

import './Bar.scss';
import Header from './components/header';
import CollapseBtn from './components/collapse-btn';

interface BarProps {
  config: ConfigProvider
}

class Bar extends Component<BarProps> {
  isComponentMounted = false;

  constructor(props : BarProps) {
    super(props);

    this.props.config.onUpdate(() => {
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
  
  render() {
    const isEnabled = this.props.config.get('enabled');
    
    if (!isEnabled) return (
      <>
      </>
    );
    
    const isCollapsed = this.props.config.get('is_bar_collapsed');

    if (isCollapsed) {
      // Show collapsed bar
      return (
        <div className="skip-silence-bar-collapsed">
          <img 
            src={browser.runtime.getURL('/assets/img/icon-128.png')}
            style={{
              width: 30,
              height: 30
            }}
            onClick={() => {
              this.props.config.set('is_bar_collapsed', false);
            }}
          />
        </div>
      )
    }

    return (
      <div className="skip-silence-bar">
        <Header />

        <Switch
          name="enabled"
          label="Enable Skip Silence"
          config={this.props.config}
        />

        <SpeedSetting
          label="Playback Speed"
          name="playback_speed"
          config={this.props.config}
        />
        <SpeedSetting
          label="Silence Speed"
          name="silence_speed"
          config={this.props.config}
        />

        <CollapseBtn config={this.props.config} />
      </div>
    );
  }
}

export default Bar;
