import { BasePage } from '../base-page';

export class MinistriesPage extends BasePage {
  readonly path = '/ministries.html';
  readonly pageName = "ministries.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Our Ministries - Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle",".mobile-menu-btn",".nav-links",".dropdown-menu"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
