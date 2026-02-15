import { BasePage } from '../base-page';

export class GiveBackupPage extends BasePage {
  readonly path = '/give-backup.html';
  readonly pageName = "give-backup.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Give Online - Church Donations | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#main-content",".mobile-menu-btn",".nav-links",".dropdown-menu"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
