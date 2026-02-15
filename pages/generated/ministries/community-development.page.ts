import { BasePage } from '../../base-page';

export class MinistriesCommunityDevelopmentPage extends BasePage {
  readonly path = '/ministries/community-development.html';
  readonly pageName = "ministries/community-development.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Community Development - Grace & Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
