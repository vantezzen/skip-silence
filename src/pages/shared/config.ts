const defaultConfig = {
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

  // Preload feature
  use_preload: false,
  has_preloaded_current_page: false,
  can_use_preload: true,
  preload_length: 0.2,

  // Command Bar
  is_bar_icon_enabled: true,
  is_bar_collapsed: true,
  highlighted_component: '',

  // Info bar
  show_saved_time_info: true,

  // Analytics
  allow_analytics: true,
  saved_time: 0,

  // Current status
  media_speed: 1,
};

export default defaultConfig;
export type ConfigKey = keyof typeof defaultConfig;
