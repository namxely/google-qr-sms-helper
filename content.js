(() => {
  // Only mount the panel on Cloud Shell or QR code pages; do not interfere on the selection or verification code input pages to prevent unintended redirects
  const isCloudConsole = location.hostname === "console.cloud.google.com";
  const isQrPage = location.pathname.includes("/challenge/iap/qrcode");
  if (!isCloudConsole && !isQrPage) {
    return;
  }

  const panel = document.createElement("div");
  panel.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:999999;background:#1a73e8;color:#fff;padding:12px 16px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.25);font-family:system-ui,sans-serif;font-size:13px;display:flex;flex-direction:column;gap:8px;min-width:240px;max-width:320px;";
  
  const title = document.createElement("div");
  title.style.cssText = "font-weight:600;font-size:14px;display:flex;justify-content:space-between;align-items:center;";
  title.textContent = "⚡ Google QR SMS Helper v1.1";
  panel.appendChild(title);

  const statusEl = document.createElement("div");
  statusEl.style.cssText = "font-size:12px;color:#e8f0fe;word-break:break-word;line-height:1.4;";
  panel.appendChild(statusEl);

  const btn = document.createElement("button");
  btn.style.cssText = "background:#fff;color:#1a73e8;border:none;padding:8px 12px;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px;";
  panel.appendChild(btn);

  document.body.appendChild(panel);

  if (isCloudConsole) {
    statusEl.textContent = "Step 1: Click the terminal icon [>_] in the top-right to open the Verify popup, or click the button below to trigger it automatically";
    btn.textContent = "1. Auto-click Cloud Shell terminal icon";
    btn.onclick = () => {
      const shellBtn = document.querySelector('button[aria-label*="Cloud Shell"], button[mattooltip*="Cloud Shell"], [id*="cloudshell"]');
      if (shellBtn) {
        shellBtn.click();
        statusEl.textContent = "✅ Clicked terminal icon, waiting for the Verify button at the bottom...";
        setTimeout(() => {
          const allBtns = Array.from(document.querySelectorAll("button, a"));
          const verifyBtn = allBtns.find(b => b.textContent.trim() === "Verify");
          if (verifyBtn) {
            verifyBtn.click();
            statusEl.textContent = "✅ Automatically clicked the Verify button!";
          }
        }, 2500);
      } else {
        statusEl.textContent = "⚠️ Terminal button not found. Please click the [>_] icon in the top-right manually";
      }
    };
  } else if (isQrPage) {
    statusEl.textContent = "QR verification page detected. Click below to inject [3,null,4] and redirect to the SMS selection page";
    btn.textContent = "⚡ One-Click Downgrade to SMS Selection";
    btn.onclick = runDowngrade;
  }

  async function extractQrUrlFromPage() {
    if ("BarcodeDetector" in window) {
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const mediaEls = Array.from(document.querySelectorAll("img, canvas"));
      for (const el of mediaEls) {
        try {
          if (el.clientWidth > 80 && el.clientHeight > 80) {
            const c = document.createElement("canvas");
            c.width = el.naturalWidth || el.clientWidth || 300;
            c.height = el.naturalHeight || el.clientHeight || 300;
            const ctx = c.getContext("2d");
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(el, 0, 0, c.width, c.height);
            const codes = await detector.detect(c);
            if (codes && codes.length > 0 && codes[0].rawValue) {
              return codes[0].rawValue;
            }
          }
        } catch (e) {}
      }
    }
    const bodyText = document.body.innerText || "";
    const shortMatch = bodyText.match(/g\.co\/verify\/[A-Za-z0-9_-]+/);
    if (shortMatch) {
      return "https://" + shortMatch[0];
    }
    const html = document.documentElement.innerHTML;
    const m = html.match(/https:\/\/accounts\.google\.com\/devicephoneverification\/begin\?[^"'\s<>]+/);
    if (m) return m[0].replace(/\\u003d/g, "=").replace(/\\u0026/g, "&");
    throw new Error("Failed to detect a QR code on the current page. Please make sure the QR code image has loaded");
  }

  async function runDowngrade() {
    try {
      btn.disabled = true;
      btn.textContent = "Detecting QR code...";
      const qrUrl = await extractQrUrlFromPage();
      statusEl.textContent = "QR code extracted, injecting [3,null,4] in the background...";

      const res = await chrome.runtime.sendMessage({ action: "downgradeQr", qrUrl });
      if (!res || !res.ok) {
        throw new Error(res ? res.error : "Background request failed");
      }
      if (!res.ydResp.includes("[3,null,4]")) {
        statusEl.textContent = "⚠️ Server response: " + res.ydResp.slice(0, 80);
        btn.disabled = false;
        btn.textContent = "Retry One-Click Downgrade";
        return;
      }

      statusEl.textContent = "✅ [3,null,4] injected! Redirecting to SMS verification page...";
      const params = new URLSearchParams(location.search);
      let cont = params.get("continue") || "";
      let targetUrl = "";

      if (cont && cont.startsWith("https://accounts.google.com/uplevelingstep/")) {
        cont = cont.replace(/&idv_xdevice=[^&]*/g, "");
        cont = cont.replace(/([?&])authuser(&|$)/, "$1authuser=0$2");
        targetUrl = cont + "&idv_xdevice=1";
      } else {
        // Standard sign-in entry: strip /qrcode, preserve and clean current params, then append &idv_xdevice=1
        targetUrl = location.href.replace("/challenge/iap/qrcode", "/challenge/iap");
        targetUrl = targetUrl.replace(/&idv_xdevice=[^&]*/g, "") + "&idv_xdevice=1";
      }
      location.replace(targetUrl);
    } catch (e) {
      statusEl.textContent = "❌ " + e.message;
      btn.disabled = false;
      btn.textContent = "Retry One-Click Downgrade";
    }
  }
})();
