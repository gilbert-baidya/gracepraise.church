import { BasePage } from '../base-page';

export class CoreValuesPage extends BasePage {
  readonly path = '/core-values.html';
  readonly pageName = "core-values.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Our Core Values - Grace and Praise Bangladeshi Church | GPBC";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
