import { BasePage } from '../base-page';

export class PositionPapersPage extends BasePage {
  readonly path = '/position-papers.html';
  readonly pageName = "position-papers.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Position Papers - Grace and Praise Bangladeshi Church | GPBC";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
