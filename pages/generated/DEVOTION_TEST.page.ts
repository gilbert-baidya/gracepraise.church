import { BasePage } from '../base-page';

export class DevotionTestPage extends BasePage {
  readonly path = '/DEVOTION_TEST.html';
  readonly pageName = "DEVOTION_TEST.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Devotion Pages Test Checklist";
  readonly criticalSelectors = ["body","h1"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
