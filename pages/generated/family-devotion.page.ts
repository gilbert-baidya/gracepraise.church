import { BasePage } from '../base-page';

export class FamilyDevotionPage extends BasePage {
  readonly path = '/family-devotion.html';
  readonly pageName = "family-devotion.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Family Devotion | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
