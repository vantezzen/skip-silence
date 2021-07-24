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

  // Command Bar
  is_bar_icon_enabled: true,
  is_bar_collapsed: true,
  highlighted_component: '',

  // Info bar
  show_saved_time_info: true,

  // Analytics
  allow_analytics: true,
  saved_time: 0,
};

export default defaultConfig;