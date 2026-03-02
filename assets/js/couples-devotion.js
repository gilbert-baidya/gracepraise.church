(function () {
  "use strict";

  const COUPLES_YEAR = 2026;

  const SHARE_BACKGROUNDS = {
    light: "assets/img/share/couples-default-1.jpg",
    dark: "assets/img/share/couples-default-2.jpg",
  };

  const STORAGE_KEYS = {
    language: "gpbcCouplesLang",
    shareBg: "gpbcCouplesShareBg",
  };

  const LUMINANCE_THRESHOLD = 150;

  const state = {
    data: null,
    monthCache: {},
    availableDates: [],
    selectedDate: todayIso(),
    currentEntry: null,
    language: "en",
    backgroundVariant: "light",
    generatedImageBlob: null,
    generatedImageUrl: "",
    lastComputedTextTone: "light",
  };

  const el = {
    app: document.getElementById("couplesDevotionApp"),
    status: document.getElementById("cdStatus"),
    dateInput: document.getElementById("cdDateInput"),
    prevBtn: document.getElementById("cdPrevBtn"),
    nextBtn: document.getElementById("cdNextBtn"),
    todayBtn: document.getElementById("cdTodayBtn"),
    langEn: document.getElementById("cdLangEn"),
    langBn: document.getElementById("cdLangBn"),
    titleEn: document.getElementById("cdTitleEn"),
    titleBn: document.getElementById("cdTitleBn"),
    verseRef: document.getElementById("cdVerseRef"),
    verseEn: document.getElementById("cdVerseEn"),
    verseBn: document.getElementById("cdVerseBn"),
    reflectionEn: document.getElementById("cdReflectionEn"),
    reflectionBn: document.getElementById("cdReflectionBn"),
    prayerEn: document.getElementById("cdPrayerEn"),
    prayerBn: document.getElementById("cdPrayerBn"),
    shareLineEn: document.getElementById("cdShareLineEn"),
    shareLineBn: document.getElementById("cdShareLineBn"),
    missingCard: document.getElementById("cdMissingCard"),
    missingMessage: document.getElementById("cdMissingMessage"),
    smsShare: document.getElementById("cdSmsShare"),
    facebookShare: document.getElementById("cdFacebookShare"),
    xShare: document.getElementById("cdXShare"),
    whatsappShare: document.getElementById("cdWhatsAppShare"),
    webShare: document.getElementById("cdWebShare"),
    copyLink: document.getElementById("cdCopyLink"),
    generateImage: document.getElementById("cdGenerateImage"),
    shareBackground: document.getElementById("cdShareBackground"),
    downloadImage: document.getElementById("cdDownloadImage"),
    copyImage: document.getElementById("cdCopyImage"),
    sharePreview: document.getElementById("cdSharePreview"),
    noPreview: document.getElementById("cdNoPreview"),
    webShareHint: document.getElementById("cdWebShareHint"),
  };

  function todayIso() {
    return formatIsoDate(new Date());
  }

  function formatIsoDate(dateValue) {
    const date = new Date(dateValue);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseIsoOrNull(rawValue) {
    if (typeof rawValue !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
      return null;
    }

    const parsed = new Date(`${rawValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return formatIsoDate(parsed) === rawValue ? rawValue : null;
  }

  function titleCaseDate(isoDate) {
    const parsed = parseIsoOrNull(isoDate);
    if (!parsed) {
      return "Invalid date";
    }

    const date = new Date(`${parsed}T00:00:00`);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }

  function addDays(isoDate, delta) {
    const parsed = parseIsoOrNull(isoDate);
    const base = parsed ? new Date(`${parsed}T00:00:00`) : new Date();
    base.setDate(base.getDate() + delta);
    return formatIsoDate(base);
  }

  function safeText(value, fallback) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    return fallback;
  }

  function setStatus(message, isError) {
    if (!el.status) {
      return;
    }

    el.status.textContent = message;
    el.status.classList.toggle("is-error", Boolean(isError));
  }

  function setQueryDate(isoDate) {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("date", isoDate);
    nextUrl.hash = "";
    window.history.replaceState({}, "", nextUrl.toString());
  }

  function getQueryDate() {
    const params = new URLSearchParams(window.location.search);
    return parseIsoOrNull(params.get("date"));
  }

  function deepLinkForDate(isoDate) {
    const url = new URL(window.location.href);
    url.searchParams.set("date", isoDate);
    url.hash = "";
    return url.toString();
  }

  function shortExcerpt(text, maxLength) {
    const compact = safeText(text, "").replace(/\s+/g, " ");
    if (compact.length <= maxLength) {
      return compact;
    }
    return `${compact.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
  }

  function isSupportedLanguage(value) {
    return value === "en" || value === "bn";
  }

  function readStoredLanguage() {
    try {
      const value = localStorage.getItem(STORAGE_KEYS.language);
      return isSupportedLanguage(value) ? value : "en";
    } catch {
      return "en";
    }
  }

  function isSupportedBackground(value) {
    return value === "light" || value === "dark";
  }

  function readStoredBackground() {
    try {
      const value = localStorage.getItem(STORAGE_KEYS.shareBg);
      return isSupportedBackground(value) ? value : null;
    } catch {
      return null;
    }
  }

  function pickInitialBackgroundVariant(isoDate) {
    const parsed = parseIsoOrNull(isoDate);
    if (!parsed) {
      return "light";
    }
    const dayNum = Number(parsed.slice(-2));
    return dayNum % 2 === 0 ? "dark" : "light";
  }

  function monthFromIso(isoDate) {
    const parsed = parseIsoOrNull(isoDate);
    if (!parsed) {
      return null;
    }
    return parsed.slice(5, 7);
  }

  function monthKeyFromIso(isoDate) {
    const parsed = parseIsoOrNull(isoDate);
    if (!parsed) {
      return null;
    }
    return parsed.slice(0, 7);
  }

  function monthDataCandidates(isoDate) {
    const month = monthFromIso(isoDate);
    if (!month) {
      return [];
    }

    const fileName = `couples-${COUPLES_YEAR}-${month}.json`;
    return [`/devotions-data/couples-${COUPLES_YEAR}/${fileName}`, `devotions-data/couples-${COUPLES_YEAR}/${fileName}`];
  }

  function resolveEntry(isoDate) {
    const monthKey = monthKeyFromIso(isoDate);
    if (!monthKey || !state.monthCache[monthKey] || !state.monthCache[monthKey].days) {
      return null;
    }
    return state.monthCache[monthKey].days[isoDate] || null;
  }

  async function loadMonthData(isoDate) {
    let lastError = null;
    const candidates = monthDataCandidates(isoDate);

    for (const url of candidates) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (!payload || typeof payload !== "object" || !payload.days || typeof payload.days !== "object") {
          throw new Error("Unexpected JSON structure.");
        }

        const dateKeys = Object.keys(payload.days)
          .map(parseIsoOrNull)
          .filter(Boolean)
          .sort();

        if (dateKeys.length === 0) {
          throw new Error("No valid dates found in dataset.");
        }

        return { payload, dateKeys, sourceUrl: url };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Unable to load couples devotion JSON.");
  }

  async function ensureMonthDataForDate(isoDate) {
    const monthKey = monthKeyFromIso(isoDate);
    if (!monthKey) {
      throw new Error("Invalid date format.");
    }

    if (state.monthCache[monthKey]) {
      state.data = state.monthCache[monthKey];
      state.availableDates = Object.keys(state.monthCache[monthKey].days || {}).sort();
      return;
    }

    const loaded = await loadMonthData(isoDate);
    state.monthCache[monthKey] = loaded.payload;
    state.data = loaded.payload;
    state.availableDates = loaded.dateKeys;
  }

  function applyLanguage(nextLanguage, options) {
    const shouldPersist = !options || options.persist !== false;
    const language = isSupportedLanguage(nextLanguage) ? nextLanguage : "en";

    state.language = language;

    if (el.app) {
      el.app.classList.remove("lang-en", "lang-bn");
      el.app.classList.add(language === "bn" ? "lang-bn" : "lang-en");
    }

    if (el.langEn) {
      const isActive = language === "en";
      el.langEn.setAttribute("aria-pressed", isActive ? "true" : "false");
      el.langEn.classList.toggle("is-active", isActive);
    }

    if (el.langBn) {
      const isActive = language === "bn";
      el.langBn.setAttribute("aria-pressed", isActive ? "true" : "false");
      el.langBn.classList.toggle("is-active", isActive);
    }

    if (shouldPersist) {
      try {
        localStorage.setItem(STORAGE_KEYS.language, language);
      } catch {
        // Ignore storage failures in restricted environments.
      }
    }
  }

  function applyBackgroundVariant(nextVariant, options) {
    const shouldPersist = !options || options.persist !== false;
    const variant = isSupportedBackground(nextVariant) ? nextVariant : "light";

    state.backgroundVariant = variant;

    if (el.shareBackground) {
      el.shareBackground.textContent = `Background: ${variant === "light" ? "Light" : "Dark"}`;
    }

    if (shouldPersist) {
      try {
        localStorage.setItem(STORAGE_KEYS.shareBg, variant);
      } catch {
        // Ignore storage failures in restricted environments.
      }
    }
  }

  function clearGeneratedImage() {
    if (state.generatedImageUrl) {
      URL.revokeObjectURL(state.generatedImageUrl);
      state.generatedImageUrl = "";
    }

    state.generatedImageBlob = null;

    if (el.sharePreview) {
      el.sharePreview.removeAttribute("src");
      el.sharePreview.classList.add("hidden");
    }

    if (el.noPreview) {
      el.noPreview.classList.remove("hidden");
    }

    if (el.downloadImage) {
      el.downloadImage.classList.add("hidden");
      el.downloadImage.removeAttribute("href");
    }

    if (el.copyImage) {
      el.copyImage.disabled = true;
    }
  }

  function setShareButtonsEnabled(isEnabled) {
    const shouldDisable = !isEnabled;
    const controls = [
      el.smsShare,
      el.whatsappShare,
      el.copyLink,
      el.facebookShare,
      el.xShare,
      el.webShare,
      el.generateImage,
      el.shareBackground,
    ];

    for (const control of controls) {
      if (control) {
        control.disabled = shouldDisable;
      }
    }

    if (el.webShareHint) {
      if (typeof navigator.share !== "function") {
        el.webShareHint.textContent = "Web Share API is not available in this browser.";
      } else {
        el.webShareHint.textContent = isEnabled
          ? "Use Web Share for quick sharing on supported devices."
          : "Select a devotion date with content to share.";
      }
    }
  }

  async function renderEntry() {
    setQueryDate(state.selectedDate);

    if (el.dateInput) {
      el.dateInput.value = state.selectedDate;
    }

    try {
      await ensureMonthDataForDate(state.selectedDate);
    } catch {
      // Fall through to missing-entry renderer for unavailable month files.
    }

    const entry = resolveEntry(state.selectedDate);
    state.currentEntry = entry;

    if (!entry) {
      el.titleEn.textContent = "No devotion available for this date";
      el.titleBn.textContent = "এই তারিখে ভক্তিমূলক পাঠ পাওয়া যায়নি";
      el.verseRef.textContent = `No entry • ${titleCaseDate(state.selectedDate)}`;
      el.verseEn.textContent = "Please choose another date from the Couples Devotion 2026 calendar.";
      el.verseBn.textContent = "দম্পতি ভক্তিমূলক ২০২৬ ক্যালেন্ডার থেকে অন্য তারিখ নির্বাচন করুন।";
      el.reflectionEn.textContent = "Use Previous/Next or pick a date to continue reading together.";
      el.reflectionBn.textContent = "Previous/Next বা Date picker ব্যবহার করে অন্য দিনের পাঠ দেখুন।";
      el.prayerEn.textContent = "Lord, keep us faithful in love, prayer, and service while we wait for the next entry.";
      el.prayerBn.textContent = "প্রভু, পরবর্তী পাঠের অপেক্ষায় আমাদের প্রেম, প্রার্থনা ও সেবায় বিশ্বস্ত রাখুন।";
      el.shareLineEn.textContent = "Pick a date with content before sharing.";
      el.shareLineBn.textContent = "শেয়ার করার আগে কনটেন্টসহ তারিখ নির্বাচন করুন।";

      if (el.missingCard) {
        el.missingCard.classList.remove("hidden");
      }
      if (el.missingMessage) {
        el.missingMessage.textContent = `No entry found for ${titleCaseDate(state.selectedDate)}. Try another day in 2026.`;
      }

      setStatus(`Showing ${titleCaseDate(state.selectedDate)}. Content not available for this date.`, false);
      setShareButtonsEnabled(false);
      clearGeneratedImage();
      return;
    }

    el.titleEn.textContent = localizedValue(entry.title, "en", "Couples Devotion");
    el.titleBn.textContent = localizedValue(entry.title, "bn", "দম্পতি ভক্তিমূলক পাঠ");
    el.verseRef.textContent = `${safeText(entry.verseRef, "Scripture")} • ${titleCaseDate(state.selectedDate)}`;
    el.verseEn.textContent = verseByLanguage(entry, "en");
    el.verseBn.textContent = verseByLanguage(entry, "bn");
    el.reflectionEn.textContent = localizedValue(entry.reflection, "en", "Reflection unavailable.");
    el.reflectionBn.textContent = localizedValue(entry.reflection, "bn", "বাংলা reflection পাওয়া যায়নি।");
    el.prayerEn.textContent = localizedValue(entry.prayer, "en", "Prayer unavailable.");
    el.prayerBn.textContent = localizedValue(entry.prayer, "bn", "বাংলা prayer পাওয়া যায়নি।");
    el.shareLineEn.textContent = localizedValue(entry.shareLine, "en", "Share encouragement with another couple.");
    el.shareLineBn.textContent = localizedValue(entry.shareLine, "bn", "আরও একটি দম্পতিকে উৎসাহ দিন।");

    if (el.missingCard) {
      el.missingCard.classList.add("hidden");
    }

    setStatus(`Loaded ${titleCaseDate(state.selectedDate)} devotion.`, false);
    setShareButtonsEnabled(true);
    clearGeneratedImage();
  }

  function localizedValue(value, language, fallback) {
    if (typeof value === "string") {
      return language === "en" ? safeText(value, fallback) : fallback;
    }

    if (value && typeof value === "object") {
      return safeText(value[language], fallback);
    }

    return fallback;
  }

  function activeLanguageText(entry, field, fallback) {
    if (!entry || !entry[field]) {
      return fallback;
    }
    return localizedValue(entry[field], state.language, fallback);
  }

  function verseByLanguage(entry, language) {
    if (!entry || typeof entry !== "object") {
      return language === "bn" ? "বাংলা পদ্য পাওয়া যায়নি।" : "Verse unavailable.";
    }

    if (entry.verse && typeof entry.verse === "object") {
      const fallback = language === "bn" ? "বাংলা পদ্য পাওয়া যায়নি।" : "Verse unavailable.";
      return safeText(entry.verse[language], fallback);
    }

    if (language === "bn") {
      return safeText(entry.bnVerse, "বাংলা পদ্য পাওয়া যায়নি।");
    }

    const phrase = safeText(entry.nivKeyPhrase, "");
    return phrase ? `NIV-based key phrase: ${phrase}` : "NIV-based key phrase unavailable.";
  }

  function shareBundle() {
    const entry = state.currentEntry;
    const url = deepLinkForDate(state.selectedDate);

    if (!entry) {
      return {
        title: "Couples Devotion",
        text: `Couples Devotion for ${state.selectedDate}`,
        url,
      };
    }

    const verseRef = safeText(entry.verseRef, "Scripture");
    const verseLine = verseByLanguage(entry, state.language);
    const shareLine = activeLanguageText(entry, "shareLine", "Grow together in Christ.");

    return {
      title: activeLanguageText(entry, "title", "Couples Devotion"),
      text: `${verseRef} — ${shortExcerpt(verseLine, 120)} ${shareLine}`.trim(),
      url,
    };
  }

  function openShareUrl(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function onSmsShare() {
    const share = shareBundle();
    const body = `${share.text}\n${share.url}`;
    window.location.href = `sms:?body=${encodeURIComponent(body)}`;
  }

  function onWhatsAppShare() {
    const share = shareBundle();
    const text = `${share.text} ${share.url}`;
    openShareUrl(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }

  function onCopyLink() {
    const share = shareBundle();
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      setStatus("Clipboard copy is not supported in this browser.", true);
      return;
    }

    navigator.clipboard
      .writeText(share.url)
      .then(() => setStatus("Deep link copied successfully.", false))
      .catch(() => setStatus("Could not copy link. Please copy from address bar.", true));
  }

  function onFacebookShare() {
    const share = shareBundle();
    openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(share.url)}`);
  }

  function onXShare() {
    const share = shareBundle();
    openShareUrl(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(share.text)}&url=${encodeURIComponent(share.url)}`
    );
  }

  function onWebShare() {
    if (typeof navigator.share !== "function") {
      setStatus("Web Share API is not available in this browser.", true);
      return;
    }

    const share = shareBundle();
    navigator
      .share({
        title: share.title,
        text: share.text,
        url: share.url,
      })
      .then(() => setStatus("Shared using native share sheet.", false))
      .catch((error) => {
        if (error && error.name === "AbortError") {
          return;
        }
        setStatus("Could not open native share sheet.", true);
      });
  }

  function splitWrappedLines(ctx, text, maxWidth) {
    const words = safeText(text, "").split(" ");
    const lines = [];
    let line = "";

    for (let i = 0; i < words.length; i += 1) {
      const test = line ? `${line} ${words[i]}` : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }

    if (line) {
      lines.push(line);
    }

    return lines;
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const lines = splitWrappedLines(ctx, text, maxWidth);
    let cursorY = y;

    for (const line of lines) {
      ctx.strokeText(line, x, cursorY);
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
    }

    return cursorY;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Image load failed: ${src}`));
      image.src = src;
    });
  }

  function drawImageCover(ctx, image, width, height) {
    const imageRatio = image.width / image.height;
    const canvasRatio = width / height;

    let drawWidth = width;
    let drawHeight = height;
    let offsetX = 0;
    let offsetY = 0;

    if (imageRatio > canvasRatio) {
      drawHeight = height;
      drawWidth = height * imageRatio;
      offsetX = (width - drawWidth) / 2;
    } else {
      drawWidth = width;
      drawHeight = width / imageRatio;
      offsetY = (height - drawHeight) / 2;
    }

    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  }

  function estimateLuminance(image) {
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = 32;
    sampleCanvas.height = 32;

    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    sampleCtx.drawImage(image, 0, 0, 32, 32);
    const data = sampleCtx.getImageData(0, 0, 32, 32).data;

    let total = 0;
    let pixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      total += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      pixels += 1;
    }

    return pixels ? total / pixels : 0;
  }

  function drawCouplesLogoOnCanvas(ctx, x, y, size, textColor) {
    const circleColor = textColor === "#101820" ? "rgba(16,24,32,0.16)" : "rgba(255,255,255,0.2)";

    ctx.save();
    ctx.translate(x, y);

    ctx.lineWidth = Math.max(2, size * 0.06);
    ctx.strokeStyle = textColor;
    ctx.fillStyle = circleColor;

    ctx.beginPath();
    ctx.arc(size * 0.35, size * 0.5, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(size * 0.62, size * 0.5, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.fillRect(size * 0.47, size * 0.05, size * 0.06, size * 0.22);
    ctx.fillRect(size * 0.41, size * 0.11, size * 0.18, size * 0.06);

    ctx.font = `${Math.round(size * 0.16)}px Arial`;
    ctx.fillText("GPBC", 0, size * 0.98);
    ctx.restore();
  }

  async function createShareImage() {
    if (!state.currentEntry) {
      setStatus("Select a date with content before generating an image.", true);
      return;
    }

    const backgroundPath = state.backgroundVariant === "dark" ? SHARE_BACKGROUNDS.dark : SHARE_BACKGROUNDS.light;
    const image = await loadImage(backgroundPath);

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    drawImageCover(ctx, image, canvas.width, canvas.height);

    const averageLuminance = estimateLuminance(image);
    const useDarkText = averageLuminance > LUMINANCE_THRESHOLD;
    const textColor = useDarkText ? "#101820" : "#f8fbff";

    state.lastComputedTextTone = useDarkText ? "dark" : "light";

    ctx.fillStyle = useDarkText ? "rgba(255, 255, 255, 0.24)" : "rgba(0, 0, 0, 0.36)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = textColor;
    ctx.strokeStyle = useDarkText ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.5)";
    ctx.lineWidth = 2;
    ctx.textAlign = "left";

    const title = activeLanguageText(state.currentEntry, "title", "Couples Devotion");
    const verseRef = safeText(state.currentEntry.verseRef, "Scripture");
    const verseLine = shortExcerpt(verseByLanguage(state.currentEntry, state.language), 180);
    const shareLine = activeLanguageText(state.currentEntry, "shareLine", "Grow together in Christ.");

    let cursorY = 106;

    ctx.font = "700 50px Georgia";
    cursorY = drawWrappedText(ctx, title, 84, cursorY, 900, 58);

    ctx.font = "600 30px Arial";
    cursorY = drawWrappedText(ctx, verseRef, 84, cursorY + 10, 900, 40);

    ctx.font = "500 27px Arial";
    cursorY = drawWrappedText(ctx, verseLine, 84, cursorY + 14, 980, 36);

    ctx.font = "500 24px Arial";
    drawWrappedText(ctx, shareLine, 84, cursorY + 14, 980, 34);

    ctx.font = "500 20px Arial";
    ctx.strokeText(`${state.selectedDate}  •  couples-devotion.html`, 84, 586);
    ctx.fillText(`${state.selectedDate}  •  couples-devotion.html`, 84, 586);

    drawCouplesLogoOnCanvas(ctx, 980, 500, 180, textColor);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error("Unable to export image."));
        }
      }, "image/png");
    });

    clearGeneratedImage();

    state.generatedImageBlob = blob;
    state.generatedImageUrl = URL.createObjectURL(blob);

    if (el.sharePreview) {
      el.sharePreview.src = state.generatedImageUrl;
      el.sharePreview.classList.remove("hidden");
    }

    if (el.noPreview) {
      el.noPreview.classList.add("hidden");
    }

    if (el.downloadImage) {
      el.downloadImage.href = state.generatedImageUrl;
      el.downloadImage.download = `couples-devotion-${state.selectedDate}.png`;
      el.downloadImage.classList.remove("hidden");
    }

    if (el.copyImage) {
      const canCopyImage = Boolean(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write);
      el.copyImage.disabled = !canCopyImage;
    }

    const toneText = useDarkText ? "dark text" : "light text";
    setStatus(`Share image generated (${state.backgroundVariant} background, ${toneText}).`, false);
  }

  function onCopyImage() {
    if (!state.generatedImageBlob) {
      setStatus("Generate a share image first.", true);
      return;
    }

    if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) {
      setStatus("Copy image is not supported in this browser.", true);
      return;
    }

    const clipboardItem = new ClipboardItem({
      "image/png": state.generatedImageBlob,
    });

    navigator.clipboard
      .write([clipboardItem])
      .then(() => setStatus("Generated image copied to clipboard.", false))
      .catch(() => setStatus("Could not copy image. Use Download PNG.", true));
  }

  function triggerRender() {
    renderEntry().catch((error) => {
      setStatus(`Could not render Couples Devotion data. ${error && error.message ? error.message : ""}`, true);
    });
  }

  function onPrevDate() {
    state.selectedDate = addDays(state.selectedDate, -1);
    triggerRender();
  }

  function onNextDate() {
    state.selectedDate = addDays(state.selectedDate, 1);
    triggerRender();
  }

  function onToday() {
    state.selectedDate = todayIso();
    triggerRender();
  }

  function onDateInputChange(event) {
    const nextDate = parseIsoOrNull(event.target.value);
    if (!nextDate) {
      setStatus("Please select a valid date.", true);
      return;
    }

    state.selectedDate = nextDate;
    triggerRender();
  }

  function onToggleLanguage(language) {
    applyLanguage(language);
    setStatus(language === "bn" ? "বাংলা কনটেন্ট দেখানো হচ্ছে।" : "Showing English content.", false);
  }

  function onToggleBackground() {
    const next = state.backgroundVariant === "light" ? "dark" : "light";
    applyBackgroundVariant(next);
    setStatus(`Background set to ${next}.`, false);
  }

  function bindEvents() {
    el.prevBtn.addEventListener("click", onPrevDate);
    el.nextBtn.addEventListener("click", onNextDate);
    el.todayBtn.addEventListener("click", onToday);
    el.dateInput.addEventListener("change", onDateInputChange);

    el.langEn.addEventListener("click", () => onToggleLanguage("en"));
    el.langBn.addEventListener("click", () => onToggleLanguage("bn"));

    el.smsShare.addEventListener("click", onSmsShare);
    el.whatsappShare.addEventListener("click", onWhatsAppShare);
    el.copyLink.addEventListener("click", onCopyLink);
    el.facebookShare.addEventListener("click", onFacebookShare);
    el.xShare.addEventListener("click", onXShare);
    el.webShare.addEventListener("click", onWebShare);

    el.generateImage.addEventListener("click", () => {
      createShareImage().catch((error) => {
        setStatus(error && error.message ? error.message : "Share image generation failed.", true);
      });
    });

    el.shareBackground.addEventListener("click", onToggleBackground);
    el.copyImage.addEventListener("click", onCopyImage);
  }

  async function init() {
    setShareButtonsEnabled(false);

    const queryDate = getQueryDate();
    state.selectedDate = queryDate || todayIso();
    applyLanguage(readStoredLanguage(), { persist: false });

    const storedBackground = readStoredBackground();
    if (storedBackground) {
      applyBackgroundVariant(storedBackground, { persist: false });
    } else {
      applyBackgroundVariant(pickInitialBackgroundVariant(state.selectedDate), { persist: false });
    }

    bindEvents();

    await renderEntry();
  }

  init();
})();
