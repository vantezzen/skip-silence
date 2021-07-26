declare interface Window {
  sa_event: (name : string, callback?: () => void) => void
  plausible: (name : string, options?: { callback?: () => void, props?: { [key: string]: any } }) => void,

  ytplayer: { [key: string]: any }
};
