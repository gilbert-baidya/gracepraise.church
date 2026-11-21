import { BasePage } from '../base-page';

export class GivePage extends BasePage {
  readonly path = '/give.html';
  readonly pageName = "give.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Give | Support Our Ministry | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".give-v14-gift-card","#paypalPaymentBtn","#paypal-handoff-note"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
