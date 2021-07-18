const defaultConfig = {
  enabled: false,

  // Thresholds
  silence_threshold: 30,
  samples_threshold: 10,
  
  // Speeds
  playback_speed: 1,
  playback_speed_is_custom: false, // True if the user wants to type in their own speed
  silence_speed: 3,
  silence_speed_is_custom: false,

  mute_silence: false,

  // Command Bar
  is_bar_icon_enabled: true,
  is_bar_collapsed: true,
  highlighted_component: '',

  // Analytics
  allow_analytics: true,
};

export default defaultConfig;