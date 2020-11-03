/**
 * Print values to the console if we are in debugging mode
 * 
 * @param args Console arguments. These will be directly passed to console.log
 */
export default function debug(...args : any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
}
