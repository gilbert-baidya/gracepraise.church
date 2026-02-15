import { BasePage } from '../../base-page';

export class AdminIndexPage extends BasePage {
  readonly path = '/admin/index.html';
  readonly pageName = "admin/index.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "GPBC Admin Panel";
  readonly criticalSelectors = ["body"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
