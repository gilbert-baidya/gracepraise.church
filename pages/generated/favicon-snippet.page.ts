import { BasePage } from '../base-page';

export class FaviconSnippetPage extends BasePage {
  readonly path = '/favicon-snippet.html';
  readonly pageName = "favicon-snippet.html";
  readonly isFullDocument = false;
  readonly criticalSelectors = ["body"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
