import { BasePage } from '../base-page';

export class LeadershipPage extends BasePage {
  readonly path = '/leadership.html';
  readonly pageName = "leadership.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Our Leadership - Grace and Praise Bangladeshi Church | GPBC";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
