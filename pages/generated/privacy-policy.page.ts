import { BasePage } from '../base-page';

export class PrivacyPolicyPage extends BasePage {
  readonly path = '/privacy-policy.html';
  readonly pageName = "privacy-policy.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Privacy Policy - Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
