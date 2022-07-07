/**
 * Create an audio context that is not suspended.
 * This will create a normal context. If the context is suspended,
 * it will make sure to require a user interaction to resume it.
 * 
 * @returns Audio Context
 */
export default function createAudioContextSecure(): Promise<AudioContext> {
  return new Promise((resolve, reject) => {

    const audioContext = new AudioContext();
    if (audioContext.state === 'suspended') {
      console.log('Skip Silence: Audio context is suspended, trying to resume');

      const resumeElement = document.createElement('div');
      resumeElement.setAttribute('style', 'position:absolute;z-index:999999;top:0;left:0;width:100vw;height:100vh;background-color:white;display:flex;justify-content:center;align-items:center;color: #212121;flex-direction: column;cursor:pointer;isolation: isolate;');
      resumeElement.innerHTML = `
        <h1>Skip Silence requires an interaction</h1>
        <p>Due to your browser's security restrictions, Skip Silence requries a user interaction to start</p>
        <p>Press anywhere on the page</p>
      `;
      document.body.appendChild(resumeElement);
      resumeElement.addEventListener('click', async () => {
        await audioContext.resume();
        resumeElement.remove();
        resolve(audioContext);
      });
    } else {
      resolve(audioContext);
    }
  });
}