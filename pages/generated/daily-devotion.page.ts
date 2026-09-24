import { BasePage } from '../base-page';

export class DailyDevotionPage extends BasePage {
  readonly path = '/daily-devotion.html';
  readonly pageName = "daily-devotion.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Daily Devotion";
  readonly criticalSelectors = ["body","header","nav","main","footer","#heroTitle","#darkModeToggle","#main-content","#heroSubtitle",".devotion-hero"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
