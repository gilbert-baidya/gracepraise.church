import { BasePage } from '../../../base-page';

export class KidsGamesIndexPage extends BasePage {
  readonly path = '/kids/games/index.html';
  readonly pageName = "kids/games/index.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Kids Games | GPBC";
  readonly criticalSelectors = ["body","main","h1",".hero"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
