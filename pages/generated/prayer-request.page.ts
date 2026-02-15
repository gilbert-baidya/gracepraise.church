import { BasePage } from '../base-page';

export class PrayerRequestPage extends BasePage {
  readonly path = '/prayer-request.html';
  readonly pageName = "prayer-request.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Prayer Request | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","form","h1","#darkModeToggle","#main-content","#prayer-form"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
