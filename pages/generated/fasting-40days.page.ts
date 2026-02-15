import { BasePage } from '../base-page';

export class Fasting40daysPage extends BasePage {
  readonly path = '/fasting-40days.html';
  readonly pageName = "fasting-40days.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "40 Days Fasting | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
