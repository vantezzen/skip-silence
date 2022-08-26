import React from "react"
import {
  BarChart2,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Columns,
  FastForward,
  Info,
  PieChart,
  Play,
  Power,
  Speaker,
  Volume,
  Volume2
} from "react-feather"
import { CSSTransition } from "react-transition-group"

import SelectAnalyserType from "~shared/components/SelectAnalyserType"
import type { TabState } from "~shared/state"

import SliderSetting from "../../shared/components/sliderSetting"
import SpeedSetting from "../../shared/components/speedSetting"
import Switch from "../../shared/components/switch"
import __ from "../../shared/i18n"
import { isChromium } from "../../shared/platform"
import FormSection from "./FormSection"
import "./SettingsForm.scss"
import HelpModal from "./helpModal"

function SettingsForm({
  config,
  isPlus,
  showPlusPopup,
  isSecureContext
}: {
  config: TabState
  isPlus: boolean
  showPlusPopup: () => void
  isSecureContext: boolean
}) {
  const grayOutWhenDisabled = {
    opacity: config.current.enabled ? 1 : 0.3,
    transition: "all 0.3s"
  }
  const [showAdvancedSettings, setShowAdvancedSettings] = React.useState(false)

  return (
    <>
      <Switch
        name="enabled"
        label={
          <>
            <Power
              strokeWidth={3}
              style={{ width: 15 }}
              className="setting-icon"
            />{" "}
            {__("enable")}
          </>
        }
        config={config}
      />

      <div style={grayOutWhenDisabled}>
        <FormSection title={__("sectionSpeed")}>
          <div id="speed-settings">
            <SpeedSetting
              label={
                <>
                  <Play className="setting-icon" /> {__("playbackSpeed")}
                </>
              }
              name="playback_speed"
              config={config}
              isPlus={isPlus}
              showPlusPopup={() => showPlusPopup()}
              info={
                <HelpModal>
                  <h2>{__("playbackSpeed")}</h2>
                  <p>{__("playbackSpeedHelp")}</p>
                </HelpModal>
              }
            />

            <SpeedSetting
              label={
                <>
                  <FastForward className="setting-icon" /> {__("silenceSpeed")}
                </>
              }
              name="silence_speed"
              config={config}
              isPlus={isPlus}
              showPlusPopup={() => showPlusPopup()}
              info={
                <HelpModal>
                  <h2>{__("silenceSpeed")}</h2>
                  <p>{__("silenceSpeedHelp")}</p>
                </HelpModal>
              }
            />
          </div>
        </FormSection>

        <FormSection title={__("sectionThreshold")}>
          <Switch
            name="dynamic_silence_threshold"
            label={
              <>
                <BarChart2 className="setting-icon" />{" "}
                {__("useDynamicThreshold")}
                {!isPlus ? " ★" : ""}{" "}
                <div className="beta">
                  beta
                  <br />
                  &nbsp;
                </div>
              </>
            }
            config={config}
            plusDisabled={!isPlus}
            openPlusPopup={() => showPlusPopup()}
            info={
              <HelpModal>
                <h2>{__("useDynamicThreshold")}</h2>
                <p>{__("useDynamicThresholdHelp")}</p>
              </HelpModal>
            }
          />

          <CSSTransition
            in={!config.current.dynamic_silence_threshold}
            timeout={300}
            classNames="opacity-transition"
            className="speed-transition">
            <SliderSetting
              label={
                <>
                  <Volume2 className="setting-icon" /> {__("volumeThreshold")}
                </>
              }
              max={200}
              name="silence_threshold"
              config={config}
              unit="%"
              half
              orange
              info={
                <HelpModal>
                  <h2>{__("volumeThreshold")}</h2>
                  <p>{__("volumeThresholdHelp")}</p>
                </HelpModal>
              }
            />
          </CSSTransition>
        </FormSection>

        <FormSection title={__("sectionAdvanced")}>
          <button
            className="advanced-button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}>
            {showAdvancedSettings ? (
              <ChevronUp className="setting-icon" />
            ) : (
              <ChevronDown className="setting-icon" />
            )}
            {__("advancedSettings")}
          </button>

          {showAdvancedSettings && (
            <>
              <SelectAnalyserType
                config={config}
                isSecureContext={isSecureContext}
              />

              <SliderSetting
                label={
                  <>
                    <Columns className="setting-icon" /> {__("sampleThreshold")}
                  </>
                }
                max={50}
                name="samples_threshold"
                config={config}
                unit=" samples"
                half={false}
                info={
                  <HelpModal>
                    <h2>{__("sampleThreshold")}</h2>
                    <p>{__("sampleThresholdHelp")}</p>
                  </HelpModal>
                }
              />

              <Switch
                name="mute_silence"
                label={
                  <>
                    <Volume className="setting-icon" /> {__("muteSilence")}
                    {!isPlus ? " ★" : ""}
                  </>
                }
                config={config}
                plusDisabled={!isPlus}
                openPlusPopup={() => showPlusPopup()}
                info={
                  <HelpModal>
                    <h2>{__("muteSilence")}</h2>
                    <p>{__("muteSilenceHelp")}</p>
                  </HelpModal>
                }
              />

              {isChromium && (
                <Switch
                  name="keep_audio_sync"
                  label={
                    <>
                      <Speaker className="setting-icon" />{" "}
                      {__("keepAudioInSync")}
                      {!isPlus ? " ★" : ""}
                    </>
                  }
                  config={config}
                  plusDisabled={!isPlus}
                  openPlusPopup={() => showPlusPopup()}
                  info={
                    <HelpModal>
                      <h2>{__("keepAudioInSync")}</h2>
                      <p>{__("keepAudioInSyncHelp")}</p>
                    </HelpModal>
                  }
                />
              )}

              <Switch
                name="is_bar_icon_enabled"
                label={
                  <>
                    <Circle className="setting-icon" />{" "}
                    {__("enableCommandBarIcon")}
                  </>
                }
                config={config}
                info={
                  <HelpModal>
                    <h2>{__("enableCommandBarIcon")}</h2>
                    <p>{__("enableCommandBarIconHelp")}</p>
                  </HelpModal>
                }
              />

              <Switch
                name="show_saved_time_info"
                label={
                  <>
                    <Info className="setting-icon" /> {__("showSavedTimeInfo")}
                  </>
                }
                config={config}
                info={
                  <HelpModal>
                    <h2>{__("showSavedTimeInfo")}</h2>
                    <p>{__("showSavedTimeInfoHelp")}</p>
                  </HelpModal>
                }
              />

              <Switch
                name="allow_analytics"
                label={
                  <>
                    <PieChart className="setting-icon" />{" "}
                    {__("allowAnonymousAnalytics")}
                  </>
                }
                config={config}
                info={
                  <HelpModal>
                    <h2>{__("allowAnonymousAnalytics")}</h2>
                    <p>{__("allowAnonymousAnalyticsHelp")}</p>
                  </HelpModal>
                }
              />
            </>
          )}
        </FormSection>
      </div>
    </>
  )
}

export default SettingsForm
