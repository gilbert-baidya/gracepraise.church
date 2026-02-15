import { BasePage } from '../base-page';

export class ChildrenDevotionPage extends BasePage {
  readonly path = '/children-devotion.html';
  readonly pageName = "children-devotion.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Children Devotion | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
