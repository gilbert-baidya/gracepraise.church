import { BasePage } from '../../base-page';

export class MinistriesSupportMissionariesPage extends BasePage {
  readonly path = '/ministries/support-missionaries.html';
  readonly pageName = "ministries/support-missionaries.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Support Missionaries - Grace & Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
