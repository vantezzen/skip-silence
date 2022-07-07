import setupState, { State, StateEnvironment } from "@vantezzen/plasmo-state"

const initialState = {
  enabled: false,

  // Thresholds
  silence_threshold: 30,
  dynamic_silence_threshold: false,
  samples_threshold: 10,

  // Speeds
  playback_speed: 1,
  playback_speed_is_custom: false, // True if the user wants to type in their own speed
  silence_speed: 3,
  silence_speed_is_custom: false,

  // Other features
  mute_silence: false,
  keep_audio_sync: false,

  // Command Bar
  is_bar_icon_enabled: true,
  is_bar_collapsed: true,
  highlighted_component: "",

  // Info bar
  show_saved_time_info: true,

  // Analytics
  allow_analytics: true,
  saved_time: 0,

  // Current status
  media_speed: 1
}

export default function getState(
  environment: StateEnvironment,
  tabId?: number
): TabState {
  return setupState(environment, initialState, {
    persistent: [
      "silence_threshold",
      "dynamic_silence_threshold",
      "samples_threshold",

      "playback_speed",
      "playback_speed_is_custom",
      "silence_speed",
      "silence_speed_is_custom",

      "mute_silence",
      "keep_audio_sync",

      "is_bar_icon_enabled",
      "is_bar_collapsed",

      "show_saved_time_info",

      "allow_analytics",
      "saved_time"
    ],
    tabId
  })
}
export type StateKey = keyof typeof initialState
export type TabState = State<typeof initialState>
