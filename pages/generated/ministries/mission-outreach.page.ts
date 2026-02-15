import { BasePage } from '../../base-page';

export class MinistriesMissionOutreachPage extends BasePage {
  readonly path = '/ministries/mission-outreach.html';
  readonly pageName = "ministries/mission-outreach.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Mission Outreach - Grace & Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
