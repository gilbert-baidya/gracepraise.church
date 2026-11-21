import { BasePage } from '../../base-page';

export class MinistriesIndexPage extends BasePage {
  readonly path = '/ministries/index.html';
  readonly pageName = "ministries/index.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Our Ministries | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","h1","#darkModeToggle",".mobile-menu-btn",".nav-links",".dropdown-menu",".ministry-hero"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
