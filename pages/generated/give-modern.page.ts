import { BasePage } from '../base-page';

export class GiveModernPage extends BasePage {
  readonly path = '/give-modern.html';
  readonly pageName = "give-modern.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Give | Support Our Ministry | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","form","h1","#main-content","#online-content","#qr-content"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
