/**
 * Custom Playwright Reporter - Live Test Dashboard
 * Generates a real-time HTML dashboard showing test execution progress
 */

const fs = require('fs');
const path = require('path');

class DashboardReporter {
  constructor(options = {}) {
    this.outputFile = options.outputFile || 'test-dashboard.html';
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      running: 0,
      pending: 0,
      startTime: Date.now(),
      tests: []
    };
  }

  onBegin(config, suite) {
    this.stats.total = suite.allTests().length;
    this.stats.pending = this.stats.total;
    this.stats.startTime = Date.now();
    
    console.log(`\n🎭 Starting Playwright Test Execution`);
    console.log(`📊 Total Tests: ${this.stats.total}`);
    console.log(`🌐 Projects: ${config.projects.map(p => p.name).join(', ')}`);
    console.log(`⚡ Workers: ${config.workers}\n`);
    
    this.updateDashboard();
  }

  onTestBegin(test) {
    this.stats.running++;
    this.stats.pending--;
    
    this.stats.tests.push({
      title: test.title,
      location: `${test.location.file.split('/').slice(-2).join('/')}:${test.location.line}`,
      status: 'running',
      duration: 0,
      startTime: Date.now()
    });
    
    this.updateDashboard();
  }

  onTestEnd(test, result) {
    this.stats.running--;
    
    const testIndex = this.stats.tests.findIndex(t => 
      t.title === test.title && t.status === 'running'
    );
    
    if (testIndex !== -1) {
      this.stats.tests[testIndex].status = result.status;
      this.stats.tests[testIndex].duration = result.duration;
      this.stats.tests[testIndex].error = result.error?.message;
      this.stats.tests[testIndex].screenshot = result.attachments?.find(a => a.name === 'screenshot')?.path;
    }
    
    if (result.status === 'passed') {
      this.stats.passed++;
    } else if (result.status === 'failed') {
      this.stats.failed++;
      console.log(`❌ FAILED: ${test.title}`);
    } else if (result.status === 'skipped') {
      this.stats.skipped++;
    }
    
    this.updateDashboard();
  }

  onEnd(result) {
    const duration = ((Date.now() - this.stats.startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Test Execution Complete`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✅ Passed: ${this.stats.passed}`);
    console.log(`❌ Failed: ${this.stats.failed}`);
    console.log(`⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`📊 Total: ${this.stats.total}\n`);
    
    this.updateDashboard(true);
  }

  updateDashboard(final = false) {
    const duration = ((Date.now() - this.stats.startTime) / 1000).toFixed(2);
    const progress = ((this.stats.passed + this.stats.failed + this.stats.skipped) / this.stats.total * 100).toFixed(1);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playwright Test Dashboard - Live</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            background: white;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .header h1 {
            color: #667eea;
            font-size: 32px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .header .subtitle {
            color: #666;
            font-size: 14px;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-left: 16px;
        }
        .status-running {
            background: #fbbf24;
            color: #78350f;
            animation: pulse 2s infinite;
        }
        .status-complete {
            background: #10b981;
            color: white;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            transition: transform 0.2s;
        }
        .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        }
        .stat-card .label {
            font-size: 13px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        .stat-card .value {
            font-size: 36px;
            font-weight: 700;
            line-height: 1;
        }
        .stat-total .value { color: #667eea; }
        .stat-passed .value { color: #10b981; }
        .stat-failed .value { color: #ef4444; }
        .stat-running .value { color: #f59e0b; }
        .stat-pending .value { color: #8b5cf6; }
        .stat-skipped .value { color: #6b7280; }
        .progress-section {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .progress-bar-container {
            background: #e5e7eb;
            height: 24px;
            border-radius: 12px;
            overflow: hidden;
            position: relative;
        }
        .progress-bar {
            height: 100%;
            transition: width 0.3s ease;
            background: linear-gradient(90deg, #10b981 0%, #059669 100%);
            position: relative;
        }
        .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-weight: 600;
            font-size: 13px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .test-list {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            max-height: 600px;
            overflow-y: auto;
        }
        .test-list h2 {
            margin-bottom: 16px;
            color: #333;
            font-size: 20px;
        }
        .test-item {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-left: 4px solid transparent;
            transition: all 0.2s;
        }
        .test-item:hover {
            background: #f9fafb;
        }
        .test-item.running {
            background: #fef3c7;
            border-left-color: #f59e0b;
        }
        .test-item.passed {
            background: #d1fae5;
            border-left-color: #10b981;
        }
        .test-item.failed {
            background: #fee2e2;
            border-left-color: #ef4444;
        }
        .test-item.skipped {
            background: #f3f4f6;
            border-left-color: #6b7280;
        }
        .test-icon {
            font-size: 20px;
            min-width: 24px;
        }
        .test-details {
            flex: 1;
        }
        .test-title {
            font-weight: 600;
            color: #111;
            margin-bottom: 4px;
        }
        .test-location {
            font-size: 12px;
            color: #666;
        }
        .test-duration {
            font-size: 13px;
            color: #666;
            font-weight: 500;
        }
        .timer {
            background: white;
            border-radius: 12px;
            padding: 16px 24px;
            margin-bottom: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            text-align: center;
        }
        .timer .label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
        }
        .timer .time {
            font-size: 24px;
            font-weight: 700;
            color: #667eea;
        }
        .screenshot-indicator {
            font-size: 11px;
            background: #ddd;
            padding: 2px 8px;
            border-radius: 4px;
            color: #666;
        }
    </style>
    ${!final ? '<meta http-equiv="refresh" content="2">' : ''}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                🎭 Playwright Test Dashboard
                <span class="status-badge ${final ? 'status-complete' : 'status-running'}">
                    ${final ? '✅ Complete' : '⚡ Running...'}
                </span>
            </h1>
            <div class="subtitle">Real-time test execution monitoring</div>
        </div>

        <div class="timer">
            <div class="label">Execution Time</div>
            <div class="time">${duration}s</div>
        </div>

        <div class="stats-grid">
            <div class="stat-card stat-total">
                <div class="label">Total Tests</div>
                <div class="value">${this.stats.total}</div>
            </div>
            <div class="stat-card stat-passed">
                <div class="label">✅ Passed</div>
                <div class="value">${this.stats.passed}</div>
            </div>
            <div class="stat-card stat-failed">
                <div class="label">❌ Failed</div>
                <div class="value">${this.stats.failed}</div>
            </div>
            <div class="stat-card stat-running">
                <div class="label">⚡ Running</div>
                <div class="value">${this.stats.running}</div>
            </div>
            <div class="stat-card stat-pending">
                <div class="label">⏳ Pending</div>
                <div class="value">${this.stats.pending}</div>
            </div>
            <div class="stat-card stat-skipped">
                <div class="label">⏭️ Skipped</div>
                <div class="value">${this.stats.skipped}</div>
            </div>
        </div>

        <div class="progress-section">
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progress}%">
                    <span class="progress-text">${progress}% Complete</span>
                </div>
            </div>
        </div>

        <div class="test-list">
            <h2>📋 Test Execution Log (Last 50)</h2>
            ${this.stats.tests.slice(-50).reverse().map(test => `
                <div class="test-item ${test.status}">
                    <div class="test-icon">
                        ${test.status === 'running' ? '⚡' : 
                          test.status === 'passed' ? '✅' : 
                          test.status === 'failed' ? '❌' : 
                          test.status === 'skipped' ? '⏭️' : '⏳'}
                    </div>
                    <div class="test-details">
                        <div class="test-title">${test.title}</div>
                        <div class="test-location">${test.location}</div>
                        ${test.error ? `<div style="color: #ef4444; font-size: 12px; margin-top: 4px;">Error: ${test.error}</div>` : ''}
                    </div>
                    <div class="test-duration">
                        ${test.duration ? `${(test.duration / 1000).toFixed(2)}s` : '...'}
                        ${test.screenshot ? '<span class="screenshot-indicator">📸</span>' : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
    `;
    
    fs.writeFileSync(this.outputFile, html, 'utf-8');
  }

  onStdOut(chunk, test, result) {
    // Suppress stdout to keep dashboard clean
  }

  onStdErr(chunk, test, result) {
    // Suppress stderr to keep dashboard clean
  }
}

module.exports = DashboardReporter;
