export function toTwoDigit(num : number) {
  return (num < 10 ? '0' : '') + num;
}

export function formatTimelength(ms : number) {
  let remainder = ms;

  const ONE_MINUTE = 60 * 1000;
  const minutes = Math.floor(remainder / ONE_MINUTE);
  remainder -= minutes * ONE_MINUTE;

  const ONE_SECOND = 1000;
  const seconds = Math.floor(remainder / ONE_SECOND);
  remainder -= seconds * ONE_SECOND;

  return toTwoDigit(minutes) + ":" + toTwoDigit(seconds);
}