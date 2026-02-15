#!/bin/bash

# Test Status Monitor
# Shows real-time test execution stats

echo "🎭 Playwright Test Status Monitor"
echo "=================================="
echo ""

if [ ! -f "test-dashboard.html" ]; then
    echo "❌ Dashboard not found. Tests may not be running."
    echo ""
    echo "To start tests with dashboard:"
    echo "  npm run test:smoke"
    echo "  npm run test:e2e"
    exit 1
fi

# Extract stats
TOTAL=$(grep -oE 'Total Tests</div>[^>]*<div class="value">([0-9]+)' test-dashboard.html | grep -oE '[0-9]+$' | head -1)
PASSED=$(grep -oE '✅ Passed</div>[^>]*<div class="value">([0-9]+)' test-dashboard.html | grep -oE '[0-9]+$' | head -1)
FAILED=$(grep -oE '❌ Failed</div>[^>]*<div class="value">([0-9]+)' test-dashboard.html | grep -oE '[0-9]+$' | head -1)
RUNNING=$(grep -oE '⚡ Running</div>[^>]*<div class="value">([0-9]+)' test-dashboard.html | grep -oE '[0-9]+$' | head -1)
PENDING=$(grep -oE '⏳ Pending</div>[^>]*<div class="value">([0-9]+)' test-dashboard.html | grep -oE '[0-9]+$' | head -1)
SKIPPED=$(grep -oE '⏭️ Skipped</div>[^>]*<div class="value">([0-9]+)' test-dashboard.html | grep -oE '[0-9]+$' | head -1)
DURATION=$(grep -oE 'Execution Time</div>[^>]*<div class="time">([^<]+)' test-dashboard.html | sed 's/.*time">//' | head -1)

# Check if running
STATUS_BADGE=$(grep -oE 'status-badge [^"]+' test-dashboard.html | head -1)

echo "📊 Current Test Status"
echo "--------------------"
echo "📋 Total Tests:    $TOTAL"
echo "✅ Passed:         $PASSED"
echo "❌ Failed:         $FAILED"
echo "⚡ Running:        $RUNNING"
echo "⏳ Pending:        $PENDING"
echo "⏭️  Skipped:       $SKIPPED"
echo "⏱️  Duration:      $DURATION"
echo ""

# Calculate progress
if [ "$TOTAL" -gt 0 ]; then
    COMPLETED=$((PASSED + FAILED + SKIPPED))
    PROGRESS=$((COMPLETED * 100 / TOTAL))
    echo "📈 Progress: $PROGRESS% ($COMPLETED / $TOTAL tests completed)"
fi

echo ""

if echo "$STATUS_BADGE" | grep -q "running"; then
    echo "🔄 Status: Tests are currently running..."
    echo "   Dashboard auto-refreshes every 2 seconds"
    echo "   Open: file://$(pwd)/test-dashboard.html"
else
    echo "✅ Status: Test execution complete"
    echo "   View report: npm run test:report"
fi

echo ""
