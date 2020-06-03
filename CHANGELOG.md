# Changelog
## 2.2
- Remove excess "storage" and "activeTab" permissions as requested by the Google Chrome Webstore Team

## 2.0
- Add new "Pre-buffer" feature with custom setting. This feature will greatly reduce the amount of skipping of words after a silent part
- Add automatic check to see if we can use the "Pre-buffer" feature on a site
- Set VU Meter color to yellow when the "Pre-buffer" feature detects silence in a future part of the media
- Show warnings when no media or no "Pre-buffer" support is detected
- Add basic support for multiple media elements on a page
- Add basic DOM MutationObserver that allows "Skip Silence" to detect media elements that got added via JavaScript (used for one-page applications like YouTube)

## 1.0
Initial release of "Skip Silence" 🚀
