import { BasePage } from '../base-page';

export class RedesignMockupPage extends BasePage {
  readonly path = '/redesign-mockup.html';
  readonly pageName = "redesign-mockup.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Grace and Praise Bangladeshi Church - San Bernardino, CA";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1",".mobile-menu-btn",".nav-links",".dropdown-menu",".hero"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
