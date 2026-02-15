import { BasePage } from '../base-page';

export class TermsConditionsPage extends BasePage {
  readonly path = '/terms-conditions.html';
  readonly pageName = "terms-conditions.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Terms & Conditions - Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
