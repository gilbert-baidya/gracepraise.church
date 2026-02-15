#!/bin/bash

# Live Test Dashboard Viewer
# Opens the dashboard and keeps it updated

echo "🎭 Playwright Live Test Dashboard"
echo "=================================="
echo ""
echo "📊 Dashboard URL: file://$(pwd)/test-dashboard.html"
echo "🔄 Auto-refreshes every 2 seconds while tests are running"
echo "⏹️  Press Ctrl+C to stop watching"
echo ""

# Open dashboard in default browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "test-dashboard.html"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "test-dashboard.html"
else
    echo "Please open test-dashboard.html in your browser"
fi

echo "✅ Dashboard opened in your default browser"
echo ""
echo "To run tests, use:"
echo "  npm run test:e2e              # Run all tests"
echo "  npm run test:smoke            # Run smoke tests only"
echo "  npm run test:desktop          # Desktop Chrome only"
echo ""
