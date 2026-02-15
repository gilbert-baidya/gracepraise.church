import { BasePage } from '../base-page';

export class Fasting21daysPage extends BasePage {
  readonly path = '/fasting-21days.html';
  readonly pageName = "fasting-21days.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "21 Days Fasting | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
