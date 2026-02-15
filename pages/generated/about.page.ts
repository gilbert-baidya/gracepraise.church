import { BasePage } from '../base-page';

export class AboutPage extends BasePage {
  readonly path = '/about.html';
  readonly pageName = "about.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "About GPBC | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
