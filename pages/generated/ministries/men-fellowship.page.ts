import { BasePage } from '../../base-page';

export class MinistriesMenFellowshipPage extends BasePage {
  readonly path = '/ministries/men-fellowship.html';
  readonly pageName = "ministries/men-fellowship.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Men Fellowship - Grace & Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
