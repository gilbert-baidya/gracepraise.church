import { expect, type Page, type Response } from '@playwright/test';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface PageReadyOptions {
  requireTitle?: boolean;
  requireCriticalSelectors?: boolean;
  timeoutMs?: number;
}

export abstract class BasePage {
  protected constructor(protected readonly page: Page) {}

  abstract readonly path: string;
  readonly pageName: string = this.constructor.name;
  readonly isFullDocument: boolean = true;
  readonly expectedTitle?: string;
  readonly criticalSelectors: string[] = ['body'];

  async goto(options: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'; timeout?: number } = {}): Promise<Response | null> {
    const { waitUntil = 'domcontentloaded', timeout } = options;
    return this.page.goto(this.path, { waitUntil, timeout });
  }

  async waitForDomReady(timeoutMs = 15000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout: timeoutMs });
  }

  async assertCoreReady(options: PageReadyOptions = {}): Promise<void> {
    const {
      requireTitle = true,
      requireCriticalSelectors = true,
      timeoutMs = 15000
    } = options;

    await this.waitForDomReady(timeoutMs);
    await expect(this.page.locator('body')).toBeAttached({ timeout: timeoutMs });

    if (this.isFullDocument) {
      await expect(this.page.locator('html')).toBeAttached({ timeout: timeoutMs });
    }

    if (requireTitle && this.expectedTitle) {
      await expect(this.page).toHaveTitle(new RegExp(escapeRegExp(this.expectedTitle), 'i'), {
        timeout: timeoutMs
      });
    }

    if (requireCriticalSelectors) {
      for (const selector of this.criticalSelectors) {
        await expect(this.page.locator(selector).first()).toBeAttached({ timeout: timeoutMs });
      }
    }
  }

  async assertUrlPath(): Promise<void> {
    const normalized = this.path.startsWith('/') ? this.path : `/${this.path}`;

    if (normalized === '/index.html') {
      await expect(this.page).toHaveURL(/(?:\/|\/index\.html)(?:[?#].*)?$/);
      return;
    }

    if (normalized === '/fasting-40days.html') {
      await expect(this.page).toHaveURL(/(?:\/fasting-40days\.html|\/lent-fasting\.html)(?:[?#].*)?$/);
      return;
    }

    if (normalized.endsWith('/index.html')) {
      const folderPath = normalized.slice(0, -'index.html'.length);
      const filePattern = escapeRegExp(normalized);
      const folderPattern = escapeRegExp(folderPath);
      await expect(this.page).toHaveURL(new RegExp(`(?:${filePattern}|${folderPattern})(?:[?#].*)?$`));
      return;
    }

    await expect(this.page).toHaveURL(new RegExp(`${escapeRegExp(normalized)}(?:[?#].*)?$`));
  }

  async getMainHeadingText(): Promise<string | null> {
    const heading = this.page.locator('h1').first();
    if ((await heading.count()) === 0) {
      return null;
    }

    const text = await heading.textContent();
    return text ? text.trim() : null;
  }
}
