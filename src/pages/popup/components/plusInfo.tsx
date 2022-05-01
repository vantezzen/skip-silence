import React from 'react';
import { useState } from 'react';
import { browser } from 'webextension-polyfill-ts';
import trackEvent from '../../shared/analytics';
import verifyLicense from '../../shared/license';
import __ from '../../shared/i18n';

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
          <label htmlFor="key">{__('plusInfoLicenseKey')}</label>
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
                setActivateInfo(__('plusInfoLicenseKeyRequired'));
                trackEvent('empty_license');
                return;
              }

              setActivateInfo(__('plusInfoValidating'));

              const isValid = await verifyLicense(licenseKey, true);
              if (isValid) {
                await browser.storage.local.set({ license: licenseKey });
                await triggerValidation();
                setScreen('activated');
                trackEvent('activated');
              } else {
                setActivateInfo(__('plusInfoInvalidKey'));
                trackEvent('invalid_license', { key: licenseKey });
              }
            }}
            className="button-primary"
          >
            {__('plusInfoActivateLicense')}
          </button>
          <button onClick={() => setScreen('info')} className="button-primary">
            {__('plusInfoGoBack')}
          </button>
        </>
      )}

      {screen === 'activated' && (
        <>
          <h2>{__('plusInfoActivationSuccess')}</h2>

          <p>{__('plusInfoActivationSuccessThanks')}</p>
          <p>{__('plusInfoActivationSuccessInfo')}</p>

          <button onClick={onClose} className="button-primary">
            {__('plusInfoActivationSuccessClose')}
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
        {__('plusInfoClose')}
      </button>
    </div>
  );
};

export default PlusInfo;
