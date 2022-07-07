import { StateEnvironment } from "@vantezzen/plasmo-state"
import { useEffect, useState } from "react"

import type { TabState } from "~shared/state"
import getState from "~shared/state"

export default function useConfigProvider(): TabState | undefined {
  const [provider] = useState<TabState | undefined>(() => {
    return getState(StateEnvironment.Popup)
  })
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const onChange = () => {
      forceUpdate({})
    }
    provider.addListener("change", onChange)

    return () => {
      provider.removeListener("change", onChange)
    }
  }, [provider])

  return provider
}
