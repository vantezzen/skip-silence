import React from 'react';
import { useState } from 'react';
import { browser } from 'webextension-polyfill-ts';
import verifyLicense from '../../shared/license';

import "./plusInfo.scss";

const PlusInfo = ({ onClose, triggerValidation } : { onClose : () => void, triggerValidation: () => Promise<void> }) => {
  const [screen, setScreen] = useState('info');
  const [licenseKey, setKey] = useState('');
  const [activateInfo, setActivateInfo] = useState('');

  return (
    <div className="plus-info">
      <button className="close-button" onClick={onClose}>
        &times;
      </button>

      <div className="plus-icon">
        <img src="/assets/img/icon-plus.png" />
      </div>

      {screen === "info" && (
        <>
          <h2>
            Get more out of Skip Silence with Skip Silence Plus
          </h2>

          <p>
            Thank you for using "Skip Silence" to increase your productivity.
          </p>
          <p>
            To help keep the development of "Skip Silence" alive and to help expanding it to more browsers, some more advanced features require "Skip Silence Plus".
          </p>
          <p>
            "Skip Silence Plus" is a <b>one-time payment of $5</b> and allows you to activate Plus across <b>all your personal devices</b> - so you won't have to purchase mutliple licenses!
          </p>

          <button className="button-primary" onClick={() => {
            window.sa_event('open_gumroad');
            window.plausible('open_gumroad');
            window.open('https://vantezzen.gumroad.com/l/PkZjU');
          }}>
            Learn more and buy license
          </button>
          <button onClick={() => setScreen('activate')} className="button-primary">
            Activate License
          </button>
        </>
      )}

      {screen === "activate" && (
        <>

          <label htmlFor="key">License Key</label>
          <input 
            type="text" 
            id="key"
            placeholder="000000-00000-000-000000"
            value={licenseKey}
            onChange={(evt) => setKey(evt.target.value)}
          />
          {activateInfo && <p>{activateInfo}</p>}

          <button onClick={async () => {

            if (licenseKey.length === 0) {
              setActivateInfo('Please enter a license key');
              return;
            }

            setActivateInfo('Validating your license...');

            const isValid = await verifyLicense(licenseKey, true);
            if (isValid) {
              await browser.storage.local.set({ license: licenseKey });
              await triggerValidation();
              setScreen('activated')
              
            } else {
              setActivateInfo('This license key is not valid.');
            }

          }} className="button-primary">
            Activate License
          </button>
          <button onClick={() => setScreen('info')} className="button-primary">
            Go Back
          </button>
        </>
      )}

      {screen === "activated" && (
        <>
          <h2>
            Skip Silence Plus has been activated!
          </h2>

          <p>
            Thank you for purchasing Skip Silence Plus. Your donation helps continue developing Skip Silence!
          </p>
          <p>
            You can now use all of Skip Silence's features.
          </p>

          <button onClick={onClose} className="button-primary">
            Start using Skip Silence Plus
          </button>
        </>
      )}

      <button onClick={onClose} className="close-link">
        Close
      </button>
    </div>
  );
};

export default PlusInfo;
