import { BasePage } from '../../base-page';

export class MinistriesHospitalMinistryPage extends BasePage {
  readonly path = '/ministries/hospital-ministry.html';
  readonly pageName = "ministries/hospital-ministry.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Hospital Ministry - Grace & Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
