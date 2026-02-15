import { BasePage } from '../base-page';

export class BeliefsPage extends BasePage {
  readonly path = '/beliefs.html';
  readonly pageName = "beliefs.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Our Beliefs - Grace and Praise Bangladeshi Church | GPBC";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
