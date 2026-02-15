import { BasePage } from '../base-page';

export class PlanVisitPage extends BasePage {
  readonly path = '/plan-visit.html';
  readonly pageName = "plan-visit.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Plan Your Visit | Grace and Praise Bangladeshi Church";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content",".mobile-menu-btn",".nav-links"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
