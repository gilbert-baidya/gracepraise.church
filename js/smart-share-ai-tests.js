/**
 * ============================================================================
 * SMART SHARE AI - TEST SCENARIOS
 * ============================================================================
 */

// Test 1: Desktop Chrome - Should prefer URL share
console.log('=== TEST 1: Desktop Chrome ===');
const caps1 = window.smartShare.getCapabilities();
console.log('Device:', caps1.deviceType, caps1.browser);
console.log('Recommendations:', window.smartShare.getRecommendations());

// Test 2: iPhone Safari - Should prefer image share
console.log('\n=== TEST 2: Device Detection ===');
console.log('Can share files:', caps1.canShareFiles);
console.log('Has Web Share:', caps1.hasWebShare);

// Test 3: Execute smart share (auto-strategy)
console.log('\n=== TEST 3: Smart Share Execution ===');
window.smartShare.execute().then(result => {
    console.log('Result:', result);
});

// Test 4: Override with specific mode
console.log('\n=== TEST 4: Override Mode ===');
window.smartShare.execute(null, { mode: 'text' }).then(result => {
    console.log('Text mode result:', result);
});

// Test 5: Check diagnostics
console.log('\n=== TEST 5: Diagnostics ===');
console.log(window.smartShare.getDiagnostics());

// Test 6: Clear memory
console.log('\n=== TEST 6: Memory Management ===');
window.smartShare.clearMemory();
console.log('Memory cleared');
