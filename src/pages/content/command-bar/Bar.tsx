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
import CommandListener from './components/command-listener';

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
    const iconEnabled = this.props.config.get('is_bar_icon_enabled');
    const isCollapsed = this.props.config.get('is_bar_collapsed');
    
    if (!isEnabled || ( isCollapsed && !iconEnabled )) return (
      <>
      </>
    );
    

    if (isCollapsed) {
      // Show collapsed bar
      return (
        <div className="skip-silence-bar-collapsed">
          <img 
            src={browser.runtime.getURL('/assets/img/icon-128.png')}
            style={{
              width: 25,
              height: 25
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

        <CommandListener config={this.props.config} />

        <Header config={this.props.config} />
        {/* <CollapseBtn config={this.props.config} /> */}
      </div>
    );
  }
}

export default Bar;
