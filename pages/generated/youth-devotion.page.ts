import { BasePage } from '../base-page';

export class YouthDevotionPage extends BasePage {
  readonly path = '/youth-devotion.html';
  readonly pageName = "youth-devotion.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Youth Devotion | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
