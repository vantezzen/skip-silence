<p align="center">
    <img src="img/title.png"><br />
    <a href="https://chrome.google.com/webstore/detail/skip-silence/fhdmkhbefcbhakffdihhceaklaigdllh">
        <img src="img/chrome.png" alt="Availible on chrome web store" width="150">
    </a>
</p>

# Skip Silence
"Skip Silence" is a browser extension that allows you to autmatically skip parts of a video that are silent.
It is highly inspired by CaryKH's [automatic on-the-fly video editing tool](https://www.youtube.com/watch?v=DQ8orIurGxw).
The extension works with most websites that use HTML5 `audio` and `video` elements (like YouTube).

## Demo
<img src="img/demo.gif" height="300">

(Video used: Unedited part of <https://youtu.be/DQ8orIurGxw?t=234>)

## Installation
"Skip Silence" is availible through the [chrome web store](https://chrome.google.com/webstore/detail/skip-silence/fhdmkhbefcbhakffdihhceaklaigdllh).
You can also install this extension on Chrome by downloading the source from GitHub and loading the unpacked, built extension through "chrome://extensions" as a "Temporary Add-On".

## Why is Firefox unsupported?
"Skip Silence" uses JavaScript's video.playbackRate and MediaSourceElement simultaneously to achieve its effect. Unfortunately, Firefox currently [has a bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1517199) that stops video.playbackRate from working when already using MediaSourceElement - making this extension useless.

## Usage
When "Skip Silence" detects a compatible element on the current page, its icon in the menubar will be colored.

![Changing icon](img/icon_change.png)

You can now click on this icon to reveal the settings popup.

You can now:
- Click the toggle button to enable and disable "Skip Silence" for the current page
- Change "Skip Silence"'s settings
- View the current volume using the VU meter
  - The VU Meter will be blue when on normal speed and green when currently in a silent part
  - The red line represents your current volume threshold

## Limitations
- Won't work on sites that use other methods to play video or audio (e.g. Spotify Web Player uses a special method to prevent songs from being downloaded)

## How does it work?
The extension attaches a JavaScript audio analyser to the current video or audio source and will speed up or slow down the video using the current volume of the audio.

## Development

This extension is based on [lxieyang's React Extension boilerplate](https://github.com/lxieyang/chrome-extension-boilerplate-react).

To start development, follow these steps:

1. Check if your [Node.js](https://nodejs.org/) version is >= **10.13**.
2. Clone this repository.
3. Change the package's `name`, `description`, and `repository` fields in `package.json`.
4. Change the name of your extension on `src/manifest.json`.
5. Run `npm install` to install the dependencies.
6. Run `npm start`
7. Load your extension on Chrome following:
   1. Access `chrome://extensions/`
   2. Check `Developer mode`
   3. Click on `Load unpacked extension`
   4. Select the `build` folder.
8. Happy hacking.

## Contributing
Please fork this repository and create a new pull request to contribute to it.

If you notice any errors, please create a new issue on GitHub.

## License
Licensed under the [MIT License](LICENSE)
