<p align="center">
    <img src="icons/icon-500.png" height="300"><br />
    <a href="https://chrome.google.com/webstore/detail/skip-silence/fhdmkhbefcbhakffdihhceaklaigdllh">
        <img src="icons/chrome.png" alt="Availible on chrome web store" width="150">
    </a>
</p>

# Skip Silence
"Skip Silence" is a browser extension that allows you to autmatically skip parts of a video that are silent.
It is highly inspired by CaryKH's [automatic on-the-fly video editing tool](https://www.youtube.com/watch?v=DQ8orIurGxw).
The extension works with most websites that use HTML5 `audio` and `video` elements (like YouTube).

## Demo
<img src="demo.gif" height="300">

(Video used: Unedited part of <https://youtu.be/DQ8orIurGxw?t=234>)

## Installation
"Skip Silence" is availible through the [chrome web store](https://chrome.google.com/webstore/detail/skip-silence/fhdmkhbefcbhakffdihhceaklaigdllh).
You can also install this extension on Firefox or Chrome by downloading the source from GitHub and loading the unpacked extension through "about:debugging" as a "Temporary Add-On".

## How does it work?
The extension attaches a JavaScript audio analyser to the current video or audio source and will speed up or slow down the video using the current volume of the audio. This unfortunately results in the first few samples of audio after a period of silence will still be sped up.

## Contributing
Please fork this repository and create a new pull request to contribute to it.

If you notice any errors, please create a new issue on GitHub.

## License
Licensed under the [MIT License](LICENSE)