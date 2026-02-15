import { BasePage } from '../../../base-page';

export class YouthGamesIndexPage extends BasePage {
  readonly path = '/youth/games/index.html';
  readonly pageName = "youth/games/index.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Youth Games | GPBC";
  readonly criticalSelectors = ["body","main","h1",".hero"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
