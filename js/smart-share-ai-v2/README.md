# Smart Share AI V2 - Predictive Ministry Engine

## Overview

Smart Share AI V2 is an enterprise-grade predictive sharing system that learns from user patterns, pre-generates share payloads, and provides ministry insights. Built as a safe additive wrapper around the existing multi-tier share system.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Smart Share AI V2                        │
│                  (Main Orchestrator)                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌──────────────┐      ┌──────────────────┐
│  Capability  │      │  Profile Store   │
│   Detector   │      │   (Learning)     │
└──────┬───────┘      └────────┬─────────┘
       │                       │
       │      ┌────────────────┘
       │      │
       ▼      ▼
   ┌──────────────┐
   │  Predictor   │
   │  (ML-like)   │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐      ┌──────────────────┐
   │   Strategy   │◄─────┤  Pregen Engine   │
   │    Engine    │      │  (Instant Share)  │
   └──────┬───────┘      └──────────────────┘
          │
          ▼
   ┌──────────────┐
   │   Ministry   │
   │   Insights   │
   └──────────────┘
```

## Modules

### 1. **capability-detector.js**
**Purpose:** Detects device capabilities and environment

**Key Features:**
- File sharing support (navigator.canShare)
- Text/URL sharing support
- Clipboard API availability
- Network quality detection
- Device type identification (iPhone, iPad, Android, Desktop)
- Capability scoring (0-100)

**API:**
```javascript
const caps = await detector.detect();
// Returns: { canShareFiles, canShareText, canShareUrl, hasClipboard, device, network, score }
```

### 2. **profile-store.js**
**Purpose:** Persistent storage for learning patterns

**Storage Key:** `gpbc_smartShareProfileV2`

**Tracks:**
- Strategy performance (attempts, successes, avg response time)
- Theme distribution (which themes shared most)
- Time-of-day patterns (morning, midday, afternoon, evening, night)
- Device preferences
- Overall success rate

**Privacy:** Anonymous aggregate data only. No personal information tracked.

**API:**
```javascript
store.recordShare(strategy, success, theme, responseTime);
store.getStrategyScore(strategy); // Returns performance score
store.getTopThemes(limit); // Returns most shared themes
store.getTimeDistribution(); // Returns time pattern analysis
```

### 3. **predictor.js**
**Purpose:** ML-inspired prediction engine

**Algorithm:**
Weighted scoring system:
- **Capability (30%):** Can device handle this strategy?
- **History (25%):** How has this strategy performed?
- **Network (20%):** Is network quality sufficient?
- **Context (15%):** Does theme match historical patterns?
- **Time (10%):** Is this the right time of day?

**API:**
```javascript
const prediction = await predictor.predict(devotionData);
// Returns: { strategy, confidence, alternatives, reasoning }
```

**Confidence Levels:**
- **90-100%:** Very High - Strong evidence
- **75-89%:** High - Clear preference
- **60-74%:** Medium - Reasonable choice
- **<60%:** Low - Multiple options viable

### 4. **pregen-engine.js**
**Purpose:** Pre-generates share payloads for instant sharing

**Features:**
- Generates image/url/text payloads on devotion load
- 5-minute cache (300,000ms TTL)
- Background generation (non-blocking)
- Instant retrieval when share button clicked

**Cache Keys:**
```javascript
'gpbc_pregen_image_{hash}' // Canvas blob
'gpbc_pregen_url_{hash}'   // Share URL
'gpbc_pregen_text_{hash}'  // Share text
```

**API:**
```javascript
await engine.pregenerate(devotionData); // Generate all payloads
const payload = engine.getPayload(strategy, devotionData); // Retrieve cached
const ready = engine.isReady(strategy, devotionData); // Check cache
```

### 5. **strategy-engine.js**
**Purpose:** Executes optimal strategy with pregen support

**Flow:**
1. Check if payload pre-generated
2. If yes, use cached payload (instant)
3. If no, generate on-demand (normal flow)
4. Record result in profile
5. Trigger pre-generation for next time

**API:**
```javascript
const result = await engine.execute(devotionData, options);
// Returns: { success, prediction, usedPregen, error }

const recommendations = await engine.getRecommendations(devotionData);
// Returns: { primary, alternatives } with confidence scores
```

### 6. **ministry-insights.js**
**Purpose:** Anonymous aggregate analytics

**Reports:**
- **Impact Metrics:** Total shares, success rate, engagement score, estimated reach
- **Theme Distribution:** Most shared themes, theme diversity
- **Time Distribution:** Peak sharing windows, consistency score
- **Strategy Effectiveness:** Success rates by strategy
- **Device Distribution:** Share counts by device type
- **Growth Trends:** Momentum analysis
- **Recommendations:** Data-driven ministry suggestions

**Privacy:** All data anonymous and aggregate. No personal tracking.

**API:**
```javascript
const report = insights.generateReport();
// Returns comprehensive ministry analytics

const metrics = insights.getImpactMetrics();
const themes = insights.getThemeDistribution();
const timing = insights.getTimeDistribution();
const recommendations = insights.getRecommendations();
```

## Main Orchestrator (index.js)

### Global API

```javascript
// Auto-initialized on page load
window.smartShareAI = SmartShareAIv2 instance

// Main Methods
await smartShareAI.smartShare(devotionData, options); // Execute smart share
await smartShareAI.getRecommendation(devotionData);  // Get prediction only
await smartShareAI.pregenerate(devotionData);        // Manual pre-gen
smartShareAI.getInsights();                          // Ministry report
smartShareAI.getStats();                             // Quick stats
smartShareAI.getDiagnostics();                       // Full diagnostic info
smartShareAI.clearProfile();                         // Reset learning
```

### Auto-Features

1. **Auto-Initialization:** Starts on DOMContentLoaded
2. **Auto-Detection:** Scans for devotion data on page load
3. **Auto-Pregen:** Triggers pre-generation when devotion detected
4. **Auto-Learning:** Records all share attempts automatically

## Integration

### HTML (daily-devotion.html)

```html
<!-- Smart Share AI V2 - Predictive Ministry Engine -->
<script type="module" src="js/smart-share-ai-v2/capability-detector.js"></script>
<script type="module" src="js/smart-share-ai-v2/profile-store.js"></script>
<script type="module" src="js/smart-share-ai-v2/predictor.js"></script>
<script type="module" src="js/smart-share-ai-v2/pregen-engine.js"></script>
<script type="module" src="js/smart-share-ai-v2/strategy-engine.js"></script>
<script type="module" src="js/smart-share-ai-v2/ministry-insights.js"></script>
<script type="module" src="js/smart-share-ai-v2/index.js"></script>
```

### JavaScript Usage

```javascript
// Automatic (recommended)
// Just load the scripts - AI handles everything

// Manual trigger
const result = await window.smartShareAI.smartShare({
    title: "Walking in Faith",
    verse: "Psalm 23:1",
    content: "The Lord is my shepherd...",
    theme: "faith"
});

// Get prediction without sharing
const recommendation = await window.smartShareAI.getRecommendation(devotionData);
console.log(`Best strategy: ${recommendation.primary.strategy}`);
console.log(`Confidence: ${recommendation.primary.confidence}%`);

// View ministry insights
const insights = window.smartShareAI.getInsights();
console.log(`Total shares: ${insights.metrics.totalShares}`);
console.log(`Success rate: ${(insights.metrics.overallSuccessRate * 100).toFixed(1)}%`);
console.log(`Top theme: ${insights.themes.topThemes[0].theme}`);
```

## Safe Additive Pattern

✅ **DOES NOT MODIFY:**
- `share-one-tap-controller.js` (multi-tier system)
- `share-card-generator.js` (canvas rendering)
- Background intelligence systems
- Theme engine
- Manifest loading

✅ **WRAPS EXISTING:**
- Calls `oneTapDevotionShare()` via strategy engine
- Uses existing canvas generation
- Respects existing fallback ladder
- Preserves all existing functionality

✅ **ADDS NEW:**
- Predictive strategy selection
- Pre-generation for instant sharing
- Learning from user patterns
- Ministry insights dashboard

## Browser Compatibility

- **Chrome/Edge:** Full support (Web Share API, Clipboard, File sharing)
- **Safari iOS:** Full support (Native share sheet with images)
- **Safari Desktop:** Partial support (No file sharing, clipboard works)
- **Firefox:** Partial support (Limited Web Share API)
- **Fallback:** Always degrades gracefully to clipboard/download

## Performance

- **Pre-generation:** ~100-300ms (background, non-blocking)
- **Instant share:** 0ms (uses cached payload)
- **Prediction:** ~10-20ms (synchronous scoring)
- **Profile load:** ~5ms (localStorage read)
- **Memory:** ~2-5MB (includes cached images)

## Testing

### Console Commands

```javascript
// Check initialization
window.smartShareAI.getStats();

// View full diagnostics
window.smartShareAI.getDiagnostics();

// Test prediction
await window.smartShareAI.getRecommendation({
    title: "Test",
    verse: "Test 1:1",
    content: "Test content",
    theme: "test"
});

// View ministry insights
window.smartShareAI.getInsights();

// Clear learning data
window.smartShareAI.clearProfile();
```

### Test Scenarios

1. **Desktop Chrome:** Should predict 'url' or 'text' (no file sharing)
2. **iPhone Safari:** Should predict 'image' (full native support)
3. **iPad Safari:** Should predict 'image' or 'url' (depends on usage)
4. **Android Chrome:** Should predict 'image' (Web Share API with files)

## Privacy & Ethics

### What We Track (Anonymous)
- Strategy success rates
- Share themes (e.g., "faith", "hope")
- Time-of-day patterns
- Device types (iPhone, Android, Desktop)

### What We DON'T Track
- ❌ User names
- ❌ Email addresses
- ❌ Personal information
- ❌ Specific share content
- ❌ Social media handles
- ❌ Tracking pixels
- ❌ Third-party analytics

### Data Storage
- **Location:** Browser localStorage only
- **Transmission:** Never sent to server
- **Retention:** Persists until user clears browser data
- **Access:** User can clear via `smartShareAI.clearProfile()`

## Future Enhancements

### V2.1 (Planned)
- [ ] A/B testing framework
- [ ] Custom sharing templates
- [ ] Advanced time-series forecasting
- [ ] Congregation-level insights (opt-in)

### V2.2 (Planned)
- [ ] Multi-language support
- [ ] Custom theme categorization
- [ ] Advanced network quality detection
- [ ] Share preview optimization

## Support

For issues or questions:
1. Check console logs (`[Smart Share AI V2]` prefix)
2. Run `window.smartShareAI.getDiagnostics()`
3. Review this documentation
4. Contact development team

## Version History

- **V2.0.0** (Current) - Predictive Ministry Engine
- **V1.0.0** - Basic AI Orchestrator
- **V0.0.0** - Manual multi-tier system

---

**Built with ❤️ for Grace and Praise Bangladeshi Church**
