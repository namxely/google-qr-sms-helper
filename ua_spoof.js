(() => {
  // Spoof navigator as iPad Mini on non-QR pages (or pages with idv_xdevice=1 / uplevelingstep / code input)
  // Do not alter window.innerWidth / innerHeight to avoid triggering Google Closure layout redraws that reset the page
  const IPAD_MINI_UA = "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
  Object.defineProperty(navigator, 'userAgent', { get: () => IPAD_MINI_UA, configurable: true });
  Object.defineProperty(navigator, 'appVersion', { get: () => "5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1", configurable: true });
  Object.defineProperty(navigator, 'platform', { get: () => 'iPad', configurable: true });
  Object.defineProperty(navigator, 'vendor', { get: () => 'Apple Computer, Inc.', configurable: true });
  Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5, configurable: true });
  Object.defineProperty(navigator, 'userAgentData', { get: () => undefined, configurable: true });
})();
