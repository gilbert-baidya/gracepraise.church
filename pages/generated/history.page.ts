import { BasePage } from '../base-page';

export class HistoryPage extends BasePage {
  readonly path = '/history.html';
  readonly pageName = "history.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Our History - Grace and Praise Bangladeshi Church | GPBC";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
