import { BasePage } from '../../base-page';

export class MinistriesBibleStudyPage extends BasePage {
  readonly path = '/ministries/bible-study.html';
  readonly pageName = "ministries/bible-study.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Bible Study Ministry - Grace & Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
