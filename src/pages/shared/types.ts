/**
 * Messages exchanged between different components of the extension
 */
export interface ExtMessage {
  command: string,
  [key: string]: any,
}

export type MediaElement = HTMLVideoElement | HTMLAudioElement;