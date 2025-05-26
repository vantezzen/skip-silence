// src/offscreen/offscreen.ts
console.log("Offscreen document loaded.");

let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let mediaStream: MediaStream | null = null;
import { createAudioContextForOffscreenDocument } from "~shared/lib/AudioContext";

let frequencyData: Float32Array | null = null;
let targetTabId: number | null = null;
let analysisIntervalId: any = null; // For setInterval or similar

// const DESIRED_SAMPLE_RATE = 44100; // Or other desired rate - now handled in createAudioContextForOffscreenDocument if needed


async function initiateTabAudioCapture(tabId: number): Promise<{ success: boolean; error?: string }> {
  console.log(`Offscreen: Initiating tab audio capture for tabId: ${tabId}`);
  targetTabId = tabId;

  try {
    if (audioContext && audioContext.state !== 'closed') {
      console.log("Offscreen: AudioContext already exists. Closing previous context before creating a new one.");
      await audioContext.close();
    }
    audioContext = await createAudioContextForOffscreenDocument();
    
    // @ts-expect-error: chrome.tabCapture.capture is not fully typed in webextension-polyfill for MV3 promise return
    const stream: MediaStream = await new Promise((resolve, reject) => {
      chrome.tabCapture.capture({ audio: true, video: false, targetTabId: tabId }, (capturedStream) => {
        if (chrome.runtime.lastError || !capturedStream) {
          const errorMsg = `Offscreen: Failed to capture tab ${tabId}. Error: ${chrome.runtime.lastError?.message || 'No stream returned'}`;
          console.error(errorMsg);
          reject(new Error(errorMsg));
        } else {
          console.log(`Offscreen: Tab ${tabId} captured successfully.`);
          resolve(capturedStream);
        }
      });
    });

    if (!stream) { // Should be caught by the promise rejection, but as a safeguard
        const errorMsg = "Offscreen: Stream is null after capture.";
        console.error(errorMsg);
        return { success: false, error: errorMsg };
    }
    mediaStream = stream;

    sourceNode = audioContext.createMediaStreamSource(mediaStream);
    analyserNode = audioContext.createAnalyser();
    // Not setting fftSize, minDecibels, maxDecibels, smoothingTimeConstant yet, 
    // assuming defaults or they can be configured if SilenceSkipper settings are passed.
    // Example: analyserNode.fftSize = 2048;

    frequencyData = new Float32Array(analyserNode.frequencyBinCount); // For getFloatFrequencyData
    // Or for getFloatTimeDomainData: new Float32Array(analyserNode.fftSize);

    sourceNode.connect(analyserNode);
    // Do NOT connect to audioContext.destination if only for analysis.

    console.log("Offscreen: Audio pipeline set up. Starting analysis loop.");
    startAudioAnalysisLoop();

    return { success: true };
  } catch (error) {
    console.error("Offscreen: Error in initiateTabAudioCapture:", error);
    return { success: false, error: error.message };
  }
}

function inspectSampleOffscreen() {
  if (!analyserNode || !frequencyData || targetTabId === null) {
    // console.warn("Offscreen: Analyser not ready or targetTabId not set.");
    return;
  }

  // Using getFloatTimeDomainData for volume calculation, similar to original SampleInspector
  // Need to ensure frequencyData is sized for analyserNode.fftSize for this.
  // Let's adjust frequencyData initialization if we stick to getFloatTimeDomainData
  // For now, assuming frequencyData is correctly sized for getFloatTimeDomainData (i.e., new Float32Array(analyserNode.fftSize))
  // If it was intended for getFloatFrequencyData, the calculation below is different.
  // Let's assume it's time domain data for volume.
  const timeDomainData = new Float32Array(analyserNode.fftSize);
  analyserNode.getFloatTimeDomainData(timeDomainData);

  let sumOfSquares = 0;
  for (let i = 0; i < timeDomainData.length; i++) {
    sumOfSquares += timeDomainData[i] ** 2;
  }
  const rms = Math.sqrt(sumOfSquares / timeDomainData.length);
  
  // Convert RMS to dB or a simple 0-1 volume scale if needed.
  // For simplicity, sending RMS directly, or a scaled version.
  // This needs to align with how SilenceSkipper expects volume.
  // Let's assume currentVolume is RMS for now.
  const currentVolume = rms; 

  // console.log(`Offscreen: Sending audio-update for tab ${targetTabId}, volume: ${currentVolume}`);
  chrome.runtime.sendMessage({
    target: 'service-worker',
    command: 'audio-update',
    tabId: targetTabId,
    volume: currentVolume, // Make sure this aligns with what SilenceSkipper expects
    // Potentially add other metrics like isSilent based on a threshold here
  }).catch(e => console.error("Offscreen: Error sending audio-update message:", e));
}

function startAudioAnalysisLoop() {
  if (analysisIntervalId) {
    clearInterval(analysisIntervalId);
  }
  // The interval should be frequent enough for responsiveness.
  // requestAnimationFrame is not ideal for background tasks if it gets throttled.
  // setInterval is more reliable for consistent timing here.
  analysisIntervalId = setInterval(inspectSampleOffscreen, 100); // e.g., every 100ms
}

function stopTabAudioCapture() {
  console.log("Offscreen: Stopping tab audio capture for tabId:", targetTabId);
  if (analysisIntervalId) {
    clearInterval(analysisIntervalId);
    analysisIntervalId = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  if (sourceNode) {
    sourceNode.disconnect();
    sourceNode = null;
  }
  if (analyserNode) {
    analyserNode = null; // No disconnect method, just dereference
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().then(() => console.log("Offscreen: AudioContext closed."));
    audioContext = null;
  }
  frequencyData = null;
  // targetTabId = null; // Keep targetTabId if you might want to restart for the same tab without a new 'start' message
  console.log("Offscreen: Tab audio capture stopped and resources cleaned up.");
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target !== 'offscreen') {
    console.log("Offscreen: Message not for offscreen, ignoring.", request);
    return false; // Not handling this message
  }
  console.log("Offscreen: Received message:", request);

  if (request.command === "start-tab-capture") {
    if (!request.tabId) {
      console.error("Offscreen: 'start-tab-capture' command missing tabId.");
      sendResponse({ success: false, error: "Missing tabId for start-tab-capture." });
      return false; // Indicate sync response
    }
    // Stop any existing capture before starting a new one.
    stopTabAudioCapture(); 
    
    initiateTabAudioCapture(request.tabId)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicate async response
  } else if (request.command === "stop-tab-capture") {
    stopTabAudioCapture();
    sendResponse({ success: true, message: "Tab audio capture stopped." });
    return false; // Indicate sync response
  } else if (request.command === "ping") {
    console.log("Offscreen: Received ping, sending pong.");
    sendResponse({ message: "pong from offscreen" });
    return false; // Indicate sync response
  }

  console.warn("Offscreen: Unknown command received:", request.command);
  return false; // Default to not handling if command is unrecognized
});

// Signal to the service worker that the offscreen document is ready (optional, but good practice)
// This is useful if the service worker needs to know the offscreen doc is loaded,
// even before any specific commands are sent.
chrome.runtime.sendMessage({ target: 'service-worker', command: 'offscreen-ready' })
  .then(() => console.log("Offscreen: Sent 'offscreen-ready' message to service worker."))
  .catch(e => console.error("Offscreen: Error sending 'offscreen-ready' message:", e));

// Optional: Listen for when the offscreen document itself is closing to clean up.
// This might not always fire reliably or as expected for all close reasons.
// self.addEventListener('pagehide', (event) => { // or 'unload'
//   console.log("Offscreen: pagehide event triggered. Cleaning up resources.");
//   stopTabAudioCapture();
// });
// Note: chrome.offscreen.Reason.USER_MEDIA should keep the document alive as long as mediaStream is active.
// Explicitly calling stopTabAudioCapture via a message or when the extension decides is more reliable.
