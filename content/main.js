/**
 * Skip Silence Browser Extension:
 * Skip silent parts in videos and audio files.
 * 
 * Content script: Speed up and slow down source, measure volume using audio analyser
 * 
 * @author vantezzen (https://github.com/vantezzen)
 * @license MIT License
 */
// Currently disabled: Log info to page console
const isDebugging = true;
const debug = (log) => {
  if (isDebugging) {
    console.log('[Skip Silence] ' + log);
  }
}

const randomString = (length) => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Get a value from the browser storage
const getStoreKey = (key, defaultValue = false) => {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(key, (data) => {
        if (typeof key === "string") {
          resolve(data[key] || defaultValue);
        } else {
          resolve(data);
        }
      });
    } catch(e) {
      resolve(defaultValue);
    }
  });
}
// Set a value of the browser storage
const setStoreKey = (key, value) => {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [key]: value }, resolve);
  });
}

// Configuration
let config = {
  threshold: 30,
  samples_threshold: 10,
  slowdown: 100,
  audio_delay: 0.08,
  playback_speed: 1,
  silence_speed: 3,
  enabled: false,
  hasVideoElement: false,
  isConnectedToVideoElement: false,
  supportsSlowDownTime: true,
  timeSaved: 0,
  sessionId: randomString(40),
};

let mediaElements = [];

// Enable or disable browser action for current tab using background script
const enableExtension = () => {
  chrome.runtime.sendMessage({
    command: 'enable'
  });
}
const disableExtension = () => {
  chrome.runtime.sendMessage({
    command: 'disable'
  });
}

// Helper: Trigger an update to the config in the popup
const triggerUpdate = () => {
  chrome.runtime.sendMessage({
    command: 'update'
  });
}

// Load config from the storage
const loadDataFromStorage = () => {
  getStoreKey(['threshold', 'samples_threshold', 'playback_speed', 'silence_speed']).then((data) => {
    if (data.threshold) {
      config.threshold = data.threshold;
    }
    if (data.samples_threshold) {
      config.samples_threshold = data.samples_threshold;
    }
    if (data.playback_speed) {
      config.playback_speed = data.playback_speed;
    }
    if (data.silence_speed) {
      config.silence_speed = data.silence_speed;
    }
  
    triggerUpdate();
  });
};

loadDataFromStorage();

// Make sure the stats object exists
getStoreKey('stats').then((data) => {
  if (data === false) {
    setStoreKey('stats', {});
  }
})

// Update our config when the storage changes
chrome.storage.sync.onChanged.addListener(loadDataFromStorage);

// Create audio context for media element
// This way we can inspect the volume
const attachAnalyser = async element => {
  debug('Attaching analyser');
  const audio = new AudioContext();

  // Check if we can use our the pre-buffer feature
  let canUseClonedElement = true;
  try {
    await fetch(element.src, {
      method: 'HEAD'
    });
  } catch (e) {
    canUseClonedElement = false;
    config.supportsSlowDownTime = false;
  }

  let audioSrc;
  if (canUseClonedElement) {
    audioSrc = element.cloneNode();
    if (element.tagName === 'VIDEO') {
      audioSrc = document.createElement('video');
      audioSrc.src = element.src;
    } else if (element.tagName === 'AUDIO') {
      audioSrc = new Audio(element.src);
    }
  }

  // Create Context components
  const analyser = audio.createAnalyser();
  const source = audio.createMediaElementSource(audioSrc || element);

  // Connect components
  source.connect(analyser);
  if (!canUseClonedElement) {
    analyser.connect(audio.destination);
  }

  if (canUseClonedElement) {
    const updateAudioTime = () => {
      debug('Update audio timing', element.currentTime);
      audioSrc.currentTime = element.currentTime + (config.slowdown / 1000);
    }

    // Is there a potential that the two sources are out of sync?
    let shouldUpdateTime = false;

    // The extension automatically stops and starts the main media element if the cloned
    // element is buffering. This way, both elements will stay in sync.
    // In order to not get into an infinite event-triggering loop, we keep track of if the
    // main media element has been stopped programmatically
    let hasStoppedMedia = false;

    // Keep track of if the original media element was playing before we stopped it programmatically
    // (see comment above for explanation of why we do that).
    let shouldStartAfterSeeking = !element.paused;

    // Playing the original media element should also start the cloned element and update its time
    element.addEventListener('play', () => {
      debug('Started playing');
      if (!hasStoppedMedia) {
        audioSrc.play();
        shouldStartAfterSeeking = true;
        if (shouldUpdateTime) {
          updateAudioTime();
          shouldUpdateTime = false;
        }
      } else {
        debug('Extension has started media');
      }
    })
    // Pausing the original media element should also pause the cloned element
    element.addEventListener('pause', () => {
      debug('Paused source');
      if (!hasStoppedMedia) {
        audioSrc.pause();
        shouldStartAfterSeeking = false;
        shouldUpdateTime = true;
      } else {
        debug("Extension has stopped media");
      }
    })

    // When changing the pre-buffer duration, the audio source will need to re-buffer
    // again. As the normal source would continue playing tough, the two sources would
    // get out of sync.
    // The following events will make sure we keep the two elements in sync
    let updateCooldown = false;
    audioSrc.addEventListener('seeking', () => {
      debug('Seeking cloned element');
      hasStoppedMedia = true;
      // element.pause();

      // We need a cooldown, otherwise we will get stuck in a seeking loop
      // seeking -> updating time -> thus again seeking -> thus again updating time -> ...
      if (!updateCooldown) {
        updateCooldown = true;
        updateAudioTime();
        setTimeout(() => {
          updateCooldown = false;
        }, 100);
      }
    });
    audioSrc.addEventListener('canplay', () => {
      debug('Cloned element can play');
      // if (shouldStartAfterSeeking) {
      //   element.play();
      // }

      // Only reset variable after short timeout, otherwise the element.'play' event listener will not see it
      setTimeout(() => {
        hasStoppedMedia = false;
      }, 10);
    });

    // Periodically check if both elements are in sync
    setInterval(() => {
      const timeDiff = (audioSrc.currentTime * 1000) - (element.currentTime * 1000);
      // Milliseconds between the desired time difference and the actual time difference
      const msOutOfSync = Math.round(Math.abs(config.slowdown - timeDiff));
      
      // Difference should never be greater than the total slowdown time
      // Smaller differences often resolve themselves
      const needsToCorrect = msOutOfSync > config.slowdown;
      if (needsToCorrect) {
        updateAudioTime();
      }

      if (isDebugging) {
        const diffStyle = msOutOfSync > (config.slowdown / 3) ? 'color: #ff0505;' : 'color: #0fff43;'
        console.log(`[Skip Silence] MEDIA STATUS:
  Original element time: ${element.currentTime}
  Cloned element time:   ${audioSrc.currentTime}
  Time difference: ${Math.round(timeDiff)}ms
  Desired time diff: ${config.slowdown}ms
  => Cloned element is %c${msOutOfSync}ms%c out of sync
  ${needsToCorrect ? '⚠️ Re-syncing elements' : ''}`,
          diffStyle,
          'color: inherit;'
        );
      }
    }, 2000);

    updateAudioTime();
    if (!element.paused) {
      audioSrc.play();
    }
  }

  config.isConnectedToVideoElement = true;
  triggerUpdate();

  return [
    analyser,
    audio,
    audioSrc
  ];
}

debug('Hello');

// Prepare extension on current page to listen for messages from popup and control the source element
const inspectElement = async (element) => {
  debug('Inspecting ' + element.tagName + ' source');

  // Inform popup that we have a media element
  mediaElements.push(element);
  config.hasVideoElement = true;
  triggerUpdate();

  // Information for speeding up and down the video
  let isAnalyserAttached = false; // Is the AudioContext and analyser currently attached to the source?
  let analyser, audio, audioSrc; // AudioContext elements
  let freq_volume; // Current frequency volume information of source (Float32Array)
  let isSpedUp = false; // Is the source currently sped up?
  let samplesUnderThreshold = 0; // Number of samples we have been under threshold
  let speedUpPhase = 0; // Phase number of the current speed-up
  let speedUpStart = -1; // Timestamp, when we started speeding up, -1 for not started

  const setSpeed = (speed) => {
    element.playbackRate = speed;
    if (audioSrc) {
      audioSrc.playbackRate = speed;
    }
  }

  const run = async () => {
    if (!config.enabled) return;

    if (!isAnalyserAttached) {
      isAnalyserAttached = true;
      [analyser, audio, audioSrc] = await attachAnalyser(element);
      freq_volume = new Float32Array(analyser.fftSize);
    }

    analyser.getFloatTimeDomainData(freq_volume);

    // Compute volume via peak instantaneous power over the interval
    let peakInstantaneousPower = 0;
    for (let i = 0; i < freq_volume.length; i++) {
      const power = freq_volume[i];
      peakInstantaneousPower = Math.max(power, peakInstantaneousPower);
    }
    const volume = (500 * peakInstantaneousPower);

    // Check volume
    if (volume < config.threshold && !element.paused) {
      samplesUnderThreshold++;

      if (!isSpedUp && samplesUnderThreshold >= config.samples_threshold) {
        // Speed up video
        debug('Speeding up video after slowdown time');
        isSpedUp = true;
        const currentPhase = speedUpPhase;
        chrome.runtime.sendMessage({
          command: 'speedStatus',
          data: 1
        });

        // Helper function: Speed up media
        const speedUp = () => {
          debug('Speeding video up now');

          setSpeed(config.silence_speed);
          speedUpStart = element.currentTime;

          chrome.runtime.sendMessage({
            command: 'speedStatus',
            data: 2
          });
        }

        if (config.supportsSlowDownTime) {
          // Speed up the media after the slowdown time is over
          // Otherwise we will speed up the media before it has reached the silent point
          setTimeout(() => {
            // We may run into the problem that the silence is over before the slowdown time runs out.
            // e.g. with only a very short silence.
            // In that case, we would speed up the video after having already slowing it back down,
            // making the whole video play in the silence speed.
            // To fix this, this extension counts "speed up phases". Every time we slow the video back down,
            // the "speed up phase" increases by 1. We then test if we are still in the current speed up phase
            // and haven't yet moved on.
            if (speedUpPhase === currentPhase) {
              speedUp();
            } else {
              debug('Can\'t speed up: Phase already over');
            }
          }, config.slowdown);
        } else {
          speedUp();
        }


      }
    } else {
      if (isSpedUp) {
        // Slow down media
        setSpeed(config.playback_speed);
        isSpedUp = false;
        speedUpPhase++;

        if (speedUpStart !== -1) {
          // Calculate time saved
          // Source: https://github.com/exradr/skip-silence/blob/master/content/main.js#L133
          let totalTime = element.currentTime - speedUpStart;
          let speedDifference = 1 / config.playback_speed - 1 / config.silence_speed;
          let timeSaved = totalTime * speedDifference;

          config.timeSaved += timeSaved;

          // Update the storage
          getStoreKey('stats').then((data) => {
            data[config.sessionId] = config.timeSaved;
            setStoreKey('stats', data);
          })

          speedUpStart = -1;
        }

        debug('Slowing video back down');

        chrome.runtime.sendMessage({
          command: 'speedStatus',
          data: 0
        });
        triggerUpdate();
      }
      samplesUnderThreshold = 0;
    }

    // Report current volume to popup for VU Meter
    chrome.runtime.sendMessage({
      command: 'volume',
      data: volume
    });

    if (config.enabled) {
      requestAnimationFrame(run);
    }
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg.command) return;

    if (msg.command === 'config') {
      // Update source speed based on new config
      if (!msg.data.enabled && config.enabled) {
        // Extension has just been disabled - set playback speed back to 1x
        setSpeed(1);
        debug('Disabled');
      } else if (msg.data.enabled && !config.enabled) {
        // Extension has just been enabled - start extension
        setSpeed(msg.data.playback_speed);
        config.enabled = true;
        run();
        debug('Enabled');
      } else if (isSpedUp) {
        setSpeed(msg.data.silence_speed);
      } else {
        setSpeed(msg.data.playback_speed);
      }

      if (audioSrc) {
        audioSrc.currentTime = element.currentTime + (msg.data.slowdown / 1000);
      }

      config = msg.data;

      setStoreKey('threshold', config.threshold);
      setStoreKey('samples_threshold', config.samples_threshold);
      setStoreKey('playback_speed', config.playback_speed);
      setStoreKey('silence_speed', config.silence_speed);
    } else if (msg.command === 'requestConfig') {
      // Send our current config back to popup
      sendResponse(config);
    }
  })
}

const inspectAllMediaElements = () => {
  const elements = [
    ...document.getElementsByTagName('video'),
    ...document.getElementsByTagName('audio'),
  ];

  if (elements.length === 0) {
    debug('No source found');
    config.hasVideoElement = false;
    triggerUpdate();

    disableExtension();
    return;
  }
  enableExtension();

  for (const element of elements) {
    // Check if element is already being inspected
    if (!mediaElements.includes(element)) {
      inspectElement(element);
    }
  }
}

const prepareExtension = () => {
  debug('Preparing extension');

  // Detect DOM changes
  const config = {
    attributes: true,
    childList: true,
    subtree: true
  };

  const observer = new MutationObserver(() => inspectAllMediaElements());

  // Start observing the target node for configured mutations
  observer.observe(document.body, config);

  inspectAllMediaElements();
};

// Prepare extension after DOM is ready to make sure source elements are loaded
if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(prepareExtension, 1);
} else {
  document.addEventListener("DOMContentLoaded", prepareExtension);
}