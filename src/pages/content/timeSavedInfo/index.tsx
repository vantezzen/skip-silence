/**
 * Info Bar that time was saved this media
 */
import React, { Component } from 'react';
import { browser } from 'webextension-polyfill-ts';

import './info.scss';
import { toTwoDigit } from '../../shared/utils';

interface InfoProps {
  timeSaved: number
}

export default class TimeSavedInfo extends Component<InfoProps> {
  formatSavedTime(time : number) {
    const seconds = Math.floor(time / 1000);
    if (seconds > 60) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}:${toTwoDigit(seconds % 60)}`;
    }
    return `${seconds}s`;
  }

  render() {
    return (
      <div className="skip-silence-saved-info">

        <div className="skip-silence-saved-info-logo">
          <img 
            src={browser.runtime.getURL('/assets/img/icon-128.png')}
            style={{
              width: 25,
              height: 25
            }}
          />
        </div>

        <div className="skip-silence-saved-info-text">
          Skip Silence saved you {this.formatSavedTime(this.props.timeSaved)} during this media
        </div>

      </div>
    );
  }
}