import ConfigProvider from '../../shared/configProvider';
import debug from '../../shared/debug';
import AudioSync from '../AudioSync';
import SpeedController from '../SpeedController';

export default function setupBrowserContent(config: ConfigProvider) {
  const speedController = new SpeedController();
  new AudioSync(config);
  let mediaSpeed = 1;

  config.onUpdate(() => {
    const shouldBeMediaSpeed = config.get('media_speed');

    if (shouldBeMediaSpeed !== mediaSpeed) {
      mediaSpeed = shouldBeMediaSpeed;

      debug('Media speed changed to', mediaSpeed);
      speedController.setPlaybackRate(config.get('media_speed'));
    }
  });
}
