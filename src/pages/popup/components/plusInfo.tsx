import React from 'react';
import { useState } from 'react';
import { browser } from 'webextension-polyfill-ts';
import trackEvent from '../../shared/analytics';
import verifyLicense from '../../shared/license';
import __ from '../i18n';

import './plusInfo.scss';

const PlusInfo = ({
  onClose,
  triggerValidation,
}: {
  onClose: () => void;
  triggerValidation: () => Promise<void>;
}) => {
  const [screen, setScreen] = useState('info');
  const [licenseKey, setKey] = useState('');
  const [activateInfo, setActivateInfo] = useState('');

  return (
    <div className="plus-info">
      <button
        className="close-button"
        onClick={() => {
          trackEvent('plusinfo_close_top');
          onClose();
        }}
      >
        &times;
      </button>

      <div className="plus-icon">
        <img src="/assets/img/icon-plus.png" />
      </div>

      {screen === 'info' && (
        <>
          <h2>{__('plusInfoHeader')}</h2>

          <p>{__('plusInfoThankYou')}</p>
          <p>{__('plusInfoWhatIsIt')}</p>
          <p>{__('plusInfoPricing')}</p>

          <button
            className="button-primary"
            onClick={() => {
              trackEvent('plusinfo_open_gumroad');
              window.open('https://vantezzen.gumroad.com/l/PkZjU');
            }}
          >
            {__('plusInfoLearnMore')}
          </button>
          <button
            onClick={() => {
              trackEvent('plusinfo_click_activate');
              setScreen('activate');
            }}
            className="button-primary"
          >
            {__('plusInfoActivateLicense')}
          </button>
        </>
      )}

      {screen === 'activate' && (
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

          <button
            onClick={async () => {
              if (licenseKey.length === 0) {
                setActivateInfo('Please enter a license key');
                trackEvent('empty_license');
                return;
              }

              setActivateInfo('Validating your license...');

              const isValid = await verifyLicense(licenseKey, true);
              if (isValid) {
                await browser.storage.local.set({ license: licenseKey });
                await triggerValidation();
                setScreen('activated');
                trackEvent('activated');
              } else {
                setActivateInfo('This license key is not valid.');
                trackEvent('invalid_license', { key: licenseKey });
              }
            }}
            className="button-primary"
          >
            {__('plusInfoActivateLicense')}
          </button>
          <button onClick={() => setScreen('info')} className="button-primary">
            Go Back
          </button>
        </>
      )}

      {screen === 'activated' && (
        <>
          <h2>Skip Silence Plus has been activated!</h2>

          <p>
            Thank you for purchasing Skip Silence Plus. Your donation helps
            continue developing Skip Silence!
          </p>
          <p>You can now use all of Skip Silence's features.</p>

          <button onClick={onClose} className="button-primary">
            Start using Skip Silence Plus
          </button>
        </>
      )}

      <button
        onClick={() => {
          trackEvent('plusinfo_close_bottom');
          onClose();
        }}
        className="close-link"
      >
        Close
      </button>
    </div>
  );
};

export default PlusInfo;
