import { BasePage } from '../../base-page';

export class MinistriesWorshipMinistryPage extends BasePage {
  readonly path = '/ministries/worship-ministry.html';
  readonly pageName = "ministries/worship-ministry.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Worship Ministry - Grace & Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
