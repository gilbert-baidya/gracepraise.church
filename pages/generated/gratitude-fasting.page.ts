import { BasePage } from '../base-page';

export class GratitudeFastingPage extends BasePage {
  readonly path = '/gratitude-fasting.html';
  readonly pageName = "gratitude-fasting.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Gratitude Fasting 2026 | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content","#devotionContent","#devotionTopic"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
