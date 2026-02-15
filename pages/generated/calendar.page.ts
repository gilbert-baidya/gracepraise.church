import { BasePage } from '../base-page';

export class CalendarPage extends BasePage {
  readonly path = '/calendar.html';
  readonly pageName = "calendar.html";
  readonly isFullDocument = true;
  readonly expectedTitle = "Calendar 2026 - Grace and Praise Bangladeshi Church | Events & Services";
  readonly criticalSelectors = ["body","header","nav","main","footer","h1","#darkModeToggle","#main-content","#printBtn","#downloadImageBtn"];

  async openPage() {
    return this.goto();
  }

  async assertPageLoaded() {
    await this.assertCoreReady({ requireTitle: this.isFullDocument });
  }
}
