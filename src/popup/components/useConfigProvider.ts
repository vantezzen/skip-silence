import { useEffect, useState } from 'react';

import ConfigProvider, { getCurrentTabId } from '../../shared/configProvider';

export default function useConfigProvider(): ConfigProvider | undefined {
  const [tabId, setTabId] = useState(-1);
  const [provider, setProvider] = useState<ConfigProvider | undefined>();
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (tabId === -1) {
      return;
    }
    const provider = new ConfigProvider('popup', tabId);
    setProvider(provider);

    provider.onUpdate(() => {
      forceUpdate({});
    });
  }, [tabId]);

  useEffect(() => {
    getCurrentTabId().then(setTabId);
  }, []);

  return provider;
}
