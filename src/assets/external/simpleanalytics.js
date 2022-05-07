/* Simple Analytics - Privacy friendly analytics (docs.simpleanalytics.com/script; 2021-12-30; e91c; v8) */
/* eslint-env browser */

(function (window, overwriteOptions, baseUrl, apiUrlPrefix, version, saGlobal) {
  try {
    // Only load our script once, customers can still send multiple page views
    // with the sa_pageview function if they turn off auto collect.
    var loadedVariable = saGlobal + "_loaded";
    if (!window || window[loadedVariable] === true) return;
    window[loadedVariable] = true;

    /////////////////////
    // PREDEFINED VARIABLES FOR BETTER MINIFICATION
    //

    // This seems like a lot of repetition, but it makes our script available for
    // multple destination which prevents us to need multiple scripts. The minified
    // version stays small.
    var https = "https:";
    var pageviewsText = "pageview";
    var errorText = "error";
    var slash = "/";
    var protocol = https + "//";
    var con = window.console;
    var doNotTrack = "doNotTrack";
    var nav = window.navigator;
    var loc = window.location;
    var locationHostname = loc.hostname;
    var doc = window.document;
    var userAgent = nav.userAgent;
    var notSending = "Not sending request ";
    var fetchedHighEntropyValues = false;
    var encodeURIComponentFunc = encodeURIComponent;
    var decodeURIComponentFunc = decodeURIComponent;
    var stringify = JSON.stringify;
    var thousand = 1000;
    var addEventListenerFunc = window.addEventListener;
    var fullApiUrl = protocol + apiUrlPrefix + baseUrl;
    var undefinedVar = undefined;
    var documentElement = doc.documentElement || {};
    var language = "language";
    var Height = "Height";
    var Width = "Width";
    var scroll = "scroll";
    var trueText = "true";
    var uaData = nav.userAgentData;
    var scrollHeight = scroll + Height;
    var offsetHeight = "offset" + Height;
    var clientHeight = "client" + Height;
    var clientWidth = "client" + Width;
    var pagehide = "pagehide";
    var platformText = "platform";
    var platformVersionText = "platformVersion";
    var docsUrl = "https://docs.simpleanalytics.com";
    var allowParams;
    var isBotAgent =
      /(bot|spider|crawl)/i.test(userAgent) && !/(cubot)/i.test(userAgent);
    var screen = window.screen;

    /////////////////////
    // HELPER FUNCTIONS
    //

    // A simple log function so the user knows why a request is not being send
    var warn = function (message) {
      if (con && con.warn) con.warn("Simple Analytics:", message);
    };

    var now = Date.now;

    var uuid = function () {
      var cryptoObject = window.crypto || window.msCrypto;
      var emptyUUID = [1e7] + -1e3 + -4e3 + -8e3 + -1e11;
      var uuidRegex = /[018]/g;

      try {
        return emptyUUID.replace(uuidRegex, function (c) {
          return (
            c ^
            (cryptoObject.getRandomValues(new Uint8Array(1))[0] &
              (15 >> (c / 4)))
          ).toString(16);
        });
      } catch (error) {
        return emptyUUID.replace(uuidRegex, function (c) {
          var r = (Math.random() * 16) | 0,
            v = c < 2 ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }
    };

    var isFunction = function (func) {
      return typeof func == "function";
    };

    var isString = function (string) {
      return typeof string == "string";
    };

    var assign = function () {
      var to = {};
      var arg = arguments;
      for (var index = 0; index < arg.length; index++) {
        var nextSource = arg[index];
        if (nextSource) {
          for (var nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    };

    var isBoolean = function (value) {
      return !!value === value;
    };

    var getParams = function (regex, returnArray) {
      // From the search we grab the utm_source and ref and save only that
      var matches = loc.search.match(
        new RegExp("[?&](" + regex + ")=([^?&]+)", "gi")
      );
      var match = matches
        ? matches.map(function (m) {
            return m.split(/[?&=]/).slice(-2);
          })
        : [];

      if (match[0]) return returnArray ? match[0] : match[0][1];
    };

    // Ignore pages specified in data-ignore-pages
    var shouldIgnore = function (path) {
      for (var i in ignorePages) {
        var ignorePageRaw = ignorePages[i];
        if (!ignorePageRaw) continue;

        // Prepend a slash when it's missing
        var ignorePage =
          ignorePageRaw[0] == slash ? ignorePageRaw : slash + ignorePageRaw;

        try {
          if (
            ignorePage === path ||
            new RegExp(ignorePage.replace(/\*/gi, "(.*)"), "gi").test(path)
          )
            return true;
        } catch (error) {
          return false;
        }
      }
      return false;
    };

    /////////////////////
    // SEND DATA VIA OUR PIXEL
    //

    // Send data via image
    var sendData = function (data, callback) {
      data = assign(payload, page, data);

      if (allowParams)
        data.params = stringify(
          allowParams
            .map(function (param) {
              var params = getParams(param, true);
              if (!params) return;
              return { key: params[0], value: params[1] };
            })
            .filter(Boolean)
        );

      data.dev = true;

      var image = new Image();
      if (callback) {
        image.onerror = callback;
        image.onload = callback;
      }
      image.src =
        fullApiUrl +
        "/simple.gif?" +
        Object.keys(data)
          .filter(function (key) {
            return data[key] != undefinedVar;
          })
          .map(function (key) {
            return (
              encodeURIComponentFunc(key) +
              "=" +
              encodeURIComponentFunc(data[key])
            );
          })
          .join("&") +
        "&time=" +
        Date.now();
    };

    /////////////////////
    // ERROR FUNCTIONS
    //

    // Send errors
    var sendError = function (errorOrMessage) {
      errorOrMessage = errorOrMessage.message || errorOrMessage;
      warn(errorOrMessage);
      sendData({
        type: errorText,
        error: errorOrMessage,
        url: definedHostname + loc.pathname,
      });
    };

    // We listen for the error events and only send errors that are
    // from our script (checked by filename) to our server.
    addEventListenerFunc(
      errorText,
      function (event) {
        if (event.filename && event.filename.indexOf(baseUrl) > -1) {
          sendError(event.message);
        }
      },
      false
    );

    /////////////////////
    // INITIALIZE VALUES
    //

    var pushState = "pushState";
    var dis = window.dispatchEvent;

    var duration = "duration";
    var start = now();

    var scrolled = 0;

    // This code could error on (incomplete) implementations, that's why we use try...catch
    var timezone;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      /* Do nothing */
    }

    /////////////////////
    // GET SETTINGS
    //

    // Find the script element where options can be set on
    var scriptElement =
      doc.currentScript || doc.querySelector('script[src*="' + baseUrl + '"]');
    var attr = function (scriptElement, attribute) {
      return scriptElement && scriptElement.getAttribute("data-" + attribute);
    };

    // Script mode, this can be hash mode for example
    var mode = overwriteOptions.mode || attr(scriptElement, "mode");

    // Should we record Do Not Track visits?
    var collectDnt = isBoolean(overwriteOptions.collectDnt)
      ? overwriteOptions.collectDnt
      : attr(scriptElement, "ignore-dnt") == trueText ||
        attr(scriptElement, "skip-dnt") == trueText ||
        attr(scriptElement, "collect-dnt") == trueText;

    // Customers can overwrite their hostname, here we check for that
    var overwrittenHostname =
      overwriteOptions.hostname || attr(scriptElement, "hostname");
    var definedHostname = overwrittenHostname || locationHostname;

    // Some customers want to collect page views manually
    var autoCollect = !(
      attr(scriptElement, "auto-collect") == "false" ||
      overwriteOptions.autoCollect === false
    );

    var convertCommaSeparatedToArray = function (csv) {
      return Array.isArray(csv)
        ? csv
        : isString(csv) && csv.length
        ? csv.split(/, ?/)
        : [];
    };

    // Event function name
    var functionName =
      overwriteOptions.saGlobal || attr(scriptElement, "sa-global") || saGlobal;

    // Customers can ignore certain pages
    var ignorePages = convertCommaSeparatedToArray(
      overwriteOptions.ignorePages || attr(scriptElement, "ignore-pages")
    );

    // Customers can allow params
    allowParams = convertCommaSeparatedToArray(
      overwriteOptions.allowParams || attr(scriptElement, "allow-params")
    );

    // By default we allow source, medium in the URLs. With strictUtm enabled
    // we only allow it with the utm_ prefix: utm_source, utm_medium, ...
    var strictUtm =
      overwriteOptions.strictUtm || attr(scriptElement, "strict-utm");

    /////////////////////
    // PAYLOAD FOR BOTH PAGE VIEWS AND EVENTS
    //

    var bot =
      nav.webdriver ||
      window.__nightmare ||
      "callPhantom" in window ||
      "_phantom" in window ||
      "phantom" in window ||
      isBotAgent;

    var payload = {
      version: version,
      ua: userAgent,
      https: loc.protocol == https,
      timezone: timezone,
      hostname: definedHostname,
      page_id: uuid(),
      session_id: uuid(),
    };
    if (bot) payload.bot = true;

    payload.sri = false;

    // Use User-Agent Client Hints for better privacy
    // https://web.dev/user-agent-client-hints/
    if (uaData) {
      payload.mobile = uaData.mobile;
      payload.brands = stringify(uaData.brands);
    }

    /////////////////////
    // ADD WARNINGS
    //

    warn("Using latest.dev.js, please change to latest.js on production.");

    // Warn when no document.doctype is defined (this breaks some documentElement dimensions)
    if (!doc.doctype) warn("Add DOCTYPE html for more accurate dimensions");

    // When a customer overwrites the hostname, we need to know what the original
    // hostname was to hide that domain from referrer traffic
    if (definedHostname !== locationHostname)
      payload.hostname_original = locationHostname;

    // Don't track when Do Not Track is set to true
    if (!collectDnt && doNotTrack in nav && nav[doNotTrack] == "1")
      return warn(
        notSending +
          "when " +
          doNotTrack +
          " is enabled. See " +
          docsUrl +
          "/dnt"
      );

    // Warn when sending from localhost and not having a hostname set
    if (
      (locationHostname.indexOf(".") == -1 ||
        /^[0-9.:]+$/.test(locationHostname)) &&
      !overwrittenHostname
    )
      warn(
        "Set a hostname when sending data from " +
          locationHostname +
          ". See " +
          docsUrl +
          "/overwrite-domain-name"
      );

    /////////////////////
    // SETUP INITIAL VARIABLES
    //

    var page = {};
    var lastSendPath;

    // We don't want to end up with sensitive data so we clean the referrer URL
    var referrer =
      (doc.referrer || "")
        .replace(locationHostname, definedHostname)
        .replace(/^https?:\/\/((m|l|w{2,3}([0-9]+)?)\.)?([^?#]+)(.*)$/, "$4")
        .replace(/^([^/]+)$/, "$1") || undefinedVar;

    // The prefix utm_ is optional with strictUtm disabled
    var utmRegexPrefix = "(utm_)" + (strictUtm ? "" : "?");
    var source = {
      source: getParams(utmRegexPrefix + "source" + (strictUtm ? "" : "|ref")),
      medium: getParams(utmRegexPrefix + "medium"),
      campaign: getParams(utmRegexPrefix + "campaign"),
      term: getParams(utmRegexPrefix + "term"),
      content: getParams(utmRegexPrefix + "content"),
      referrer: referrer,
    };

    /////////////////////
    // TIME ON PAGE AND SCROLLED LOGIC
    //

    // We don't put msHidden in if duration block, because it's used outside of that functionality
    var msHidden = 0;

    var sendBeaconText = "sendBeacon";

    var sendOnLeave = function (id, push) {
      var append = { type: "append", original_id: push ? id : payload.page_id };

      append[duration] = Math.round((now() - start - msHidden) / thousand);
      msHidden = 0;
      start = now();

      append.scrolled = Math.max(0, scrolled, position());

      if (push || !(sendBeaconText in nav)) {
        // sendData will assign payload to request
        sendData(append);
      } else {
        nav[sendBeaconText](
          fullApiUrl + "/append",
          stringify(assign(payload, append))
        );
      }
    };

    var hiddenStart;
    window.addEventListener(
      "visibilitychange",
      function () {
        if (doc.hidden) {
          if (!("on" + pagehide in window)) sendOnLeave();
          hiddenStart = now();
        } else msHidden += now() - hiddenStart;
      },
      false
    );

    addEventListenerFunc(pagehide, sendOnLeave, false);

    var body = doc.body || {};
    var position = function () {
      try {
        var documentClientHeight = documentElement[clientHeight] || 0;
        var height = Math.max(
          body[scrollHeight] || 0,
          body[offsetHeight] || 0,
          documentElement[clientHeight] || 0,
          documentElement[scrollHeight] || 0,
          documentElement[offsetHeight] || 0
        );
        return Math.min(
          100,
          Math.round(
            (100 * ((documentElement.scrollTop || 0) + documentClientHeight)) /
              height /
              5
          ) * 5
        );
      } catch (error) {
        return 0;
      }
    };

    addEventListenerFunc("load", function () {
      scrolled = position();
      addEventListenerFunc(
        scroll,
        function () {
          if (scrolled < position()) scrolled = position();
        },
        false
      );
    });

    /////////////////////
    // ACTUAL PAGE VIEW LOGIC
    //

    var getPath = function (overwrite) {
      var path = "";

      // decodeURIComponent can fail when having invalid characters
      // https://github.com/simpleanalytics/roadmap/issues/462
      try {
        path = overwrite || decodeURIComponentFunc(loc.pathname);
      } catch (e) {
        // Do nothing
      }

      // Ignore pages specified in data-ignore-pages
      if (shouldIgnore(path)) {
        warn(notSending + "because " + path + " is ignored");
        return;
      }

      // Add hash to path when script is put in to hash mode
      if (mode == "hash" && loc.hash) path += loc.hash.split("?")[0];

      return path;
    };

    // Send page view and append data to it
    var sendPageView = function (isPushState, deleteSourceInfo, sameSite) {
      if (isPushState) sendOnLeave("" + payload.page_id, true);
      payload.page_id = uuid();

      var currentPage = definedHostname + getPath();

      sendData(
        assign(
          deleteSourceInfo
            ? {
                referrer: sameSite ? referrer : null,
              }
            : source,
          {
            id: payload.page_id,
            type: pageviewsText,
          }
        )
      );

      referrer = currentPage;
    };

    var pageview = function (isPushState, pathOverwrite) {
      // Obfuscate personal data in URL by dropping the search and hash
      var path = getPath(pathOverwrite);

      // Don't send the last path again (this could happen when pushState is used to change the path hash or search)
      if (!path || lastSendPath == path) return;

      lastSendPath = path;
      page.path = path;

      page.viewport_width =
        Math.max(documentElement[clientWidth] || 0, window.innerWidth || 0) ||
        null;
      page.viewport_height =
        Math.max(documentElement[clientHeight] || 0, window.innerHeight || 0) ||
        null;

      if (nav[language]) page[language] = nav[language];

      if (screen) {
        page.screen_width = screen.width;
        page.screen_height = screen.height;
      }

      // If a user does refresh we need to delete the referrer because otherwise it count double
      var perf = window.performance;
      var navigation = "navigation";

      // Check if back, forward or reload buttons are being used in modern browsers
      var userNavigated =
        perf &&
        perf.getEntriesByType &&
        perf.getEntriesByType(navigation)[0] &&
        perf.getEntriesByType(navigation)[0].type
          ? ["reload", "back_forward"].indexOf(
              perf.getEntriesByType(navigation)[0].type
            ) > -1
          : // Check if back, forward or reload buttons are being use in older browsers
            // 1: TYPE_RELOAD, 2: TYPE_BACK_FORWARD
            perf &&
            perf[navigation] &&
            [1, 2].indexOf(perf[navigation].type) > -1;

      // Check if referrer is the same as current real hostname (not the defined hostname!)
      var sameSite = referrer
        ? doc.referrer.split(slash)[2] == locationHostname
        : false;

      // We set unique variable based on pushstate or back navigation, if no match we check the referrer
      page.unique = isPushState || userNavigated ? false : !sameSite;

      var triggerSendPageView = function () {
        fetchedHighEntropyValues = true;
        sendPageView(isPushState, isPushState || userNavigated, sameSite);
      };

      if (!fetchedHighEntropyValues) {
        // Request platform information if this is available
        try {
          if (uaData && isFunction(uaData.getHighEntropyValues)) {
            uaData
              .getHighEntropyValues([platformText, platformVersionText])
              .then(function (highEntropyValues) {
                payload.os_name = highEntropyValues[platformText];
                payload.os_version = highEntropyValues[platformVersionText];
                triggerSendPageView();
              })
              .catch(triggerSendPageView);
          } else {
            triggerSendPageView();
          }
        } catch (e) {
          triggerSendPageView();
        }
      } else {
        triggerSendPageView();
      }
    };

    /////////////////////
    // AUTOMATED PAGE VIEW COLLECTION
    //

    var his = window.history;
    var hisPushState = his ? his.pushState : undefinedVar;

    // Overwrite history pushState function to
    // allow listening on the pushState event
    if (autoCollect && hisPushState && Event && dis) {
      var stateListener = function (type) {
        var orig = his[type];
        return function () {
          var arg = arguments;
          var rv = orig.apply(this, arg);
          var event;
          if (typeof Event == "function") {
            event = new Event(type);
          } else {
            // Fix for IE
            // https://github.com/simpleanalytics/scripts/issues/8
            event = doc.createEvent("Event");
            event.initEvent(type, true, true);
          }
          event.arguments = arg;
          dis(event);
          return rv;
        };
      };

      his.pushState = stateListener(pushState);

      addEventListenerFunc(
        pushState,
        function () {
          pageview(1);
        },
        false
      );

      addEventListenerFunc(
        "popstate",
        function () {
          pageview(1);
        },
        false
      );
    }

    // When in hash mode, we record a pageview based on the onhashchange function
    if (autoCollect && mode == "hash" && "onhashchange" in window) {
      addEventListenerFunc(
        "hashchange",
        function () {
          pageview(1);
        },
        false
      );
    }

    if (autoCollect) pageview();
    else
      window.sa_pageview = function (path) {
        pageview(0, path);
      };

    /////////////////////
    // EVENTS
    //

    var validTypes = ["string", "number"];

    var sendEvent = function (event, callbackRaw) {
      var eventIsFunction = isFunction(event);
      var callback = isFunction(callbackRaw) ? callbackRaw : function () {};

      if (validTypes.indexOf(typeof event) < 0 && !eventIsFunction) {
        warn("event is not a string: " + event);
        return callback();
      }

      try {
        if (eventIsFunction) {
          event = event();
          if (validTypes.indexOf(typeof event) < 0) {
            warn("event function output is not a string: " + event);
            return callback();
          }
        }
      } catch (error) {
        warn("in your event function: " + error.message);
        return callback();
      }

      event = ("" + event).replace(/[^a-z0-9]+/gi, "_").replace(/(^_|_$)/g, "");

      if (event) {
        sendData(
          assign(source, {
            type: "event",
            event: event,
          }),
          callback
        );
      }
    };

    var defaultEventFunc = function (event, callback) {
      sendEvent(event, callback);
    };

    // Set default function if user didn't define a function
    if (!window[functionName]) window[functionName] = defaultEventFunc;

    var eventFunc = window[functionName];

    // Read queue of the user defined function
    var queue = eventFunc && eventFunc.q ? eventFunc.q : [];

    // Overwrite user defined function
    window[functionName] = defaultEventFunc;

    // Post events from the queue of the user defined function
    for (var event in queue) {
      if (Object.prototype.hasOwnProperty.call(queue, event)) {
        Array.isArray(queue[event])
          ? sendEvent.apply(null, queue[event])
          : sendEvent(queue[event]);
      }
    }
  } catch (e) {
    sendError(e);
  }
})(
  window,
  {},
  "simpleanalyticscdn.com",
  "queue.",
  "cdn_latest_dev_8",
  "sa_event"
);
