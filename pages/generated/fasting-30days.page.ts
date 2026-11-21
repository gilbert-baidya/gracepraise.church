import { BasePage } from '../base-page';

export class Fasting30daysPage extends BasePage {
  readonly path = '/fasting-30days.html';
  readonly pageName = "fasting-30days.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "30-Day Consecration & Fasting Guide | GPBC";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
