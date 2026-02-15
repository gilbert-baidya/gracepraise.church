/**
 * Device Context Fixture
 * Provides device detection and viewport utilities for tests
 */

import { test as base, type Page } from '@playwright/test';

export interface DeviceContext {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  viewportWidth: number;
  viewportHeight: number;
  deviceName: string;
  hasTouch: boolean;
}

type DeviceFixtures = {
  deviceInfo: DeviceContext;
};

export const test = base.extend<DeviceFixtures>({
  deviceInfo: async ({ page, browserName }, use) => {
    const viewport = page.viewportSize();
    const width = viewport?.width || 1920;
    const height = viewport?.height || 1080;

    // Get project name from test info (contains device name)
    const projectName = test.info().project.name;

    const context: DeviceContext = {
      viewportWidth: width,
      viewportHeight: height,
      deviceName: projectName,
      hasTouch: projectName.includes('iPad') || projectName.includes('iPhone') || projectName.includes('Pixel'),
      
      // Device classification (matches navigation.js breakpoints)
      isMobile: width <= 768,
      isTablet: width > 768 && width <= 1024,
      isDesktop: width > 1024
    };

    await use(context);
  }
});

export { expect } from '@playwright/test';
