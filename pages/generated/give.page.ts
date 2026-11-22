import { BasePage } from '../base-page';

export class GivePage extends BasePage {
  readonly path = '/give.html';
  readonly pageName = "give.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Give | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content","#gift-title","#giving-card","#give-paypal","#give-confirmation"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
