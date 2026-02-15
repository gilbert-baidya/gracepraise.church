import { BasePage } from '../base-page';

export class CouplesDevotionPage extends BasePage {
  readonly path = '/couples-devotion.html';
  readonly pageName = "couples-devotion.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Couples Devotion | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
