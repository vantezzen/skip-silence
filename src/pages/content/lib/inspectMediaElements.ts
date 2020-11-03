/**
 * Search for media elements and notify about them
 */
import { MediaElement } from '../../shared/types';

/**
 * Recursively search the page for media elements
 * 
 * @param element Element to search within
 */
const getElementsRecursive = (element : HTMLElement | Document | null) => {
  if (!element) {
    return [];
  }

  // Get all media elements within this element context
  const elementsWithinRoot = [
    ...element.getElementsByTagName('video'),
    ...element.getElementsByTagName('audio'),
  ];

  // Recursively locate media elements within iframes on the page
  const elementsInNestedFrames : MediaElement[] = Array.from(element.getElementsByTagName('iframe')).reduce((acc : MediaElement[], frame) => {
    return [...acc, ...getElementsRecursive(frame.contentDocument)]
  }, []);

  // Return all elements with duplicates removed
  return [...new Set([...elementsWithinRoot, ...elementsInNestedFrames])];
};

/**
 * Search media elements on the page
 */
const searchElements = (inspectedElements : HTMLElement[], callback : Function) => {
  const elements = getElementsRecursive(document);

  for (const element of elements) {
    // Check if element is already being inspected
    if (!inspectedElements.includes(element)) {
      inspectedElements.push(element);
      callback(element);
    }
  }
};

/**
 * Inspect the page to get notified about all media elements (video and audio).
 * This will also attach a mutation observer to notify about elements that get added at a later point
 * 
 * The callback will be called with each of the elements found at any point as the first parameter (callback(element)).
 * 
 * @param callback Callback that gets called for every media element found.
 */
export default function inspectMediaElements(callback : Function) {
  // A list of all elements we have already discovered
  const inspectedElements : MediaElement[] = [];

  if (document.readyState === "complete") {
    // Search current elements
    searchElements(inspectedElements, callback);
  } else {
    // Search elements after DOM ready
    document.addEventListener("DOMContentLoaded", () => searchElements(inspectedElements, callback));
  }

  // Start a mutation observer on the current page
  const observer = new MutationObserver(() => searchElements(inspectedElements, callback));
  observer.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true
  });
}