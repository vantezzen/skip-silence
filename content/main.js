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
const debug = (log) => {
  console.log('[Skip Silence] ' + log);
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
};

let mediaElements = [];

// Enable or disable browser action for current tab using background script
const enableExtension = () => {
  chrome.runtime.sendMessage({ command: 'enable' });  
}
const disableExtension = () => {
  chrome.runtime.sendMessage({ command: 'disable' });  
}

// Create audio context for media element
// This way we can inspect the volume
const attachAnalyser = async element => {
  debug('Attaching analyser');
  const audio = new AudioContext()

  let audioSrc = element.cloneNode();
  if (element.tagName === 'VIDEO') {
    audioSrc = document.createElement('video');
    audioSrc.src = element.src;
  } else if (element.tagName === 'AUDIO') {
    audioSrc = new Audio(element.src);
  }

  // Check if we can use our cloned element
  let canUseClonedElement = true;
  try {
    await fetch(element.src, { method: 'HEAD' });
  } catch(e) {
    canUseClonedElement = false;
    config.supportsSlowDownTime = false;
    audioSrc = null;
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
  
    let shouldUpdateTime = false;
    element.addEventListener('play', () => {
      debug('Started playing');
      audioSrc.play();
      if (shouldUpdateTime) {
        updateAudioTime();
        shouldUpdateTime = false;
      }
    })
    element.addEventListener('pause', () => {
      debug('Paused source');
      audioSrc.pause();
      shouldUpdateTime = true;
    })
  
    updateAudioTime();
    if(!element.paused) {
      audioSrc.play();
    }
  }

  config.isConnectedToVideoElement = true;
  chrome.runtime.sendMessage({ command: 'update' });

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
  chrome.runtime.sendMessage({ command: 'update' });

  // Information for speeding up and down the video
  let isAnalyserAttached = false; // Is the AudioContext and analyser currently attached to the source?
  let analyser, audio, audioSrc; // AudioContext elements
  let freq_volume; // Current frequency volume information of source (Float32Array)
  let isSpedUp = false; // Is the source currently sped up?
  let samplesUnderThreshold = 0; // Number of samples we have been under threshold
  let speedUpPhase = 0; // Phase number of the current speed-up

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
      [ analyser, audio, audioSrc ] = await attachAnalyser(element);
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
        chrome.runtime.sendMessage({ command: 'speedStatus', data: 1 });

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
              debug('Speeding video up now');
              setSpeed(config.silence_speed);
              chrome.runtime.sendMessage({ command: 'speedStatus', data: 2 });
            } else {
              debug('Can\'t speed up: Phase already over');
            }
          }, config.slowdown);
        } else {
          debug('Speeding video up now');
          setSpeed(config.silence_speed);
          chrome.runtime.sendMessage({ command: 'speedStatus', data: 2 });
        }


      }
    } else {
      if (isSpedUp) {
        setSpeed(config.playback_speed);
        isSpedUp = false;
        speedUpPhase++;

        debug('Slowing video back down');

        chrome.runtime.sendMessage({ command: 'speedStatus', data: 0 });
      }
      samplesUnderThreshold = 0;
    }

    // Report current volume to popup for VU Meter
    chrome.runtime.sendMessage({ command: 'volume', data: volume }); 
  
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
    chrome.runtime.sendMessage({ command: 'update' });

    disableExtension();
    return;
  }
  enableExtension();

  for(const element of elements) {
    // Check if element is already being inspected
    if (!mediaElements.includes(element)) {
      inspectElement(element);
    }
  }
}

const prepareExtension = () => {
  debug('Preparing extension');

  // Detect DOM changes
  const config = { attributes: true, childList: true, subtree: true };

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