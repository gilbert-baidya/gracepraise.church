import { BasePage } from '../base-page';

export class MissionPage extends BasePage {
  readonly path = '/mission.html';
  readonly pageName = "mission.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Our Mission - Grace and Praise Bangladeshi Church | GPBC";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
