import type { Page } from '@playwright/test';
import { BasePage } from './base-page';
import { AboutPage } from './generated/about.page';
import { AdminIndexPage } from './generated/admin/index.page';
import { BeliefsPage } from './generated/beliefs.page';
import { CalendarPage } from './generated/calendar.page';
import { ChildrenDevotionPage } from './generated/children-devotion.page';
import { CoreValuesPage } from './generated/core-values.page';
import { CouplesDevotionPage } from './generated/couples-devotion.page';
import { DailyDevotionPage } from './generated/daily-devotion.page';
import { DevotionTestPage } from './generated/DEVOTION_TEST.page';
import { FamilyDevotionPage } from './generated/family-devotion.page';
import { Fasting21daysPage } from './generated/fasting-21days.page';
import { Fasting30daysPage } from './generated/fasting-30days.page';
import { Fasting40daysPage } from './generated/fasting-40days.page';
import { FaviconSnippetPage } from './generated/favicon-snippet.page';
import { GalleryPage } from './generated/gallery.page';
import { GiveBackupPage } from './generated/give-backup.page';
import { GiveBootstrapPage } from './generated/give-bootstrap.page';
import { GiveModernPage } from './generated/give-modern.page';
import { GiveProfessionalPage } from './generated/give-professional.page';
import { GiveTailwindPage } from './generated/give-tailwind.page';
import { GivePage } from './generated/give.page';
import { GratitudeFastingPage } from './generated/gratitude-fasting.page';
import { HeptagonCarouselSectionPage } from './generated/heptagon-carousel-section.page';
import { HistoryPage } from './generated/history.page';
import { HomePageTestPage } from './generated/HOME_PAGE_TEST.page';
import { IndexPage } from './generated/index.page';
import { KidsGamesIndexPage } from './generated/kids/games/index.page';
import { LeadershipPage } from './generated/leadership.page';
import { MinistriesPage } from './generated/ministries.page';
import { MinistriesBibleStudyPage } from './generated/ministries/bible-study.page';
import { MinistriesCommunityDevelopmentPage } from './generated/ministries/community-development.page';
import { MinistriesHomelessMinistryPage } from './generated/ministries/homeless-ministry.page';
import { MinistriesHospitalMinistryPage } from './generated/ministries/hospital-ministry.page';
import { MinistriesIndexPage } from './generated/ministries/index.page';
import { MinistriesKidsMinistryPage } from './generated/ministries/kids-ministry.page';
import { MinistriesMenFellowshipPage } from './generated/ministries/men-fellowship.page';
import { MinistriesMissionOutreachPage } from './generated/ministries/mission-outreach.page';
import { MinistriesPrisonMinistryPage } from './generated/ministries/prison-ministry.page';
import { MinistriesSupportMissionariesPage } from './generated/ministries/support-missionaries.page';
import { MinistriesWorshipMinistryPage } from './generated/ministries/worship-ministry.page';
import { MinistriesYouthMinistryPage } from './generated/ministries/youth-ministry.page';
import { MissionPage } from './generated/mission.page';
import { NavigationTemplatePage } from './generated/navigation-template.page';
import { PartialsFooterPage } from './generated/partials/footer.page';
import { PartialsHeaderPage } from './generated/partials/header.page';
import { PlanVisitPage } from './generated/plan-visit.page';
import { PositionPapersPage } from './generated/position-papers.page';
import { PrayerRequestPage } from './generated/prayer-request.page';
import { PrivacyPolicyPage } from './generated/privacy-policy.page';
import { RedesignMockupPage } from './generated/redesign-mockup.page';
import { ShapeSectionsPage } from './generated/shape-sections.page';
import { SmsOptInPage } from './generated/sms-opt-in.page';
import { SongbookPage } from './generated/songbook.page';
import { TermsConditionsPage } from './generated/terms-conditions.page';
import { TestConnectionPage } from './generated/test-connection.page';
import { TestimoniesPage } from './generated/testimonies.page';
import { TranslateTestPage } from './generated/translate-test.page';
import { YouthDevotionPage } from './generated/youth-devotion.page';
import { YouthGamesIndexPage } from './generated/youth/games/index.page';

export interface PageRegistryEntry {
  htmlPath: string;
  className: string;
  isFullDocument: boolean;
  expectedTitle?: string;
  create: (page: Page) => BasePage;
}

export const pageRegistry: PageRegistryEntry[] = [
  {
    htmlPath: "about.html",
    className: "AboutPage",
    isFullDocument: true,
    expectedTitle: "About GPBC | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new AboutPage(page)
  },
  {
    htmlPath: "admin/index.html",
    className: "AdminIndexPage",
    isFullDocument: true,
    expectedTitle: "GPBC Admin Panel",
    create: (page: Page) => new AdminIndexPage(page)
  },
  {
    htmlPath: "beliefs.html",
    className: "BeliefsPage",
    isFullDocument: true,
    expectedTitle: "Our Beliefs - Grace and Praise Bangladeshi Church | GPBC",
    create: (page: Page) => new BeliefsPage(page)
  },
  {
    htmlPath: "calendar.html",
    className: "CalendarPage",
    isFullDocument: true,
    expectedTitle: "Calendar 2026 - Grace and Praise Bangladeshi Church | Events & Services",
    create: (page: Page) => new CalendarPage(page)
  },
  {
    htmlPath: "children-devotion.html",
    className: "ChildrenDevotionPage",
    isFullDocument: true,
    expectedTitle: "Children Devotion | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new ChildrenDevotionPage(page)
  },
  {
    htmlPath: "core-values.html",
    className: "CoreValuesPage",
    isFullDocument: true,
    expectedTitle: "Our Core Values - Grace and Praise Bangladeshi Church | GPBC",
    create: (page: Page) => new CoreValuesPage(page)
  },
  {
    htmlPath: "couples-devotion.html",
    className: "CouplesDevotionPage",
    isFullDocument: true,
    expectedTitle: "Couples Devotion | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new CouplesDevotionPage(page)
  },
  {
    htmlPath: "daily-devotion.html",
    className: "DailyDevotionPage",
    isFullDocument: true,
    expectedTitle: "Daily Devotion | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new DailyDevotionPage(page)
  },
  {
    htmlPath: "DEVOTION_TEST.html",
    className: "DevotionTestPage",
    isFullDocument: true,
    expectedTitle: "Devotion Pages Test Checklist",
    create: (page: Page) => new DevotionTestPage(page)
  },
  {
    htmlPath: "family-devotion.html",
    className: "FamilyDevotionPage",
    isFullDocument: true,
    expectedTitle: "Family Devotion | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new FamilyDevotionPage(page)
  },
  {
    htmlPath: "fasting-21days.html",
    className: "Fasting21daysPage",
    isFullDocument: true,
    expectedTitle: "21 Days Fasting | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new Fasting21daysPage(page)
  },
  {
    htmlPath: "fasting-30days.html",
    className: "Fasting30daysPage",
    isFullDocument: true,
    expectedTitle: "30 Days Fasting | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new Fasting30daysPage(page)
  },
  {
    htmlPath: "fasting-40days.html",
    className: "Fasting40daysPage",
    isFullDocument: true,
    expectedTitle: "40 Days Fasting | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new Fasting40daysPage(page)
  },
  {
    htmlPath: "favicon-snippet.html",
    className: "FaviconSnippetPage",
    isFullDocument: false,
    expectedTitle: undefined,
    create: (page: Page) => new FaviconSnippetPage(page)
  },
  {
    htmlPath: "gallery.html",
    className: "GalleryPage",
    isFullDocument: true,
    expectedTitle: "Church Gallery - Grace and Praise Bangladeshi Church",
    create: (page: Page) => new GalleryPage(page)
  },
  {
    htmlPath: "give-backup.html",
    className: "GiveBackupPage",
    isFullDocument: true,
    expectedTitle: "Give Online - Church Donations | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new GiveBackupPage(page)
  },
  {
    htmlPath: "give-bootstrap.html",
    className: "GiveBootstrapPage",
    isFullDocument: true,
    expectedTitle: "Give | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new GiveBootstrapPage(page)
  },
  {
    htmlPath: "give-modern.html",
    className: "GiveModernPage",
    isFullDocument: true,
    expectedTitle: "Give | Support Our Ministry | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new GiveModernPage(page)
  },
  {
    htmlPath: "give-professional.html",
    className: "GiveProfessionalPage",
    isFullDocument: true,
    expectedTitle: "Give | Support Our Ministry | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new GiveProfessionalPage(page)
  },
  {
    htmlPath: "give-tailwind.html",
    className: "GiveTailwindPage",
    isFullDocument: true,
    expectedTitle: "Give | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new GiveTailwindPage(page)
  },
  {
    htmlPath: "give.html",
    className: "GivePage",
    isFullDocument: true,
    expectedTitle: "Give | Support Our Ministry | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new GivePage(page)
  },
  {
    htmlPath: "gratitude-fasting.html",
    className: "GratitudeFastingPage",
    isFullDocument: true,
    expectedTitle: "Gratitude Fasting 2026 | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new GratitudeFastingPage(page)
  },
  {
    htmlPath: "heptagon-carousel-section.html",
    className: "HeptagonCarouselSectionPage",
    isFullDocument: false,
    expectedTitle: undefined,
    create: (page: Page) => new HeptagonCarouselSectionPage(page)
  },
  {
    htmlPath: "history.html",
    className: "HistoryPage",
    isFullDocument: true,
    expectedTitle: "Our History - Grace and Praise Bangladeshi Church | GPBC",
    create: (page: Page) => new HistoryPage(page)
  },
  {
    htmlPath: "HOME_PAGE_TEST.html",
    className: "HomePageTestPage",
    isFullDocument: true,
    expectedTitle: "Home Page Test Checklist",
    create: (page: Page) => new HomePageTestPage(page)
  },
  {
    htmlPath: "index.html",
    className: "IndexPage",
    isFullDocument: true,
    expectedTitle: "Grace and Praise Bangladeshi Church - San Bernardino, CA",
    create: (page: Page) => new IndexPage(page)
  },
  {
    htmlPath: "kids/games/index.html",
    className: "KidsGamesIndexPage",
    isFullDocument: true,
    expectedTitle: "Kids Games | GPBC",
    create: (page: Page) => new KidsGamesIndexPage(page)
  },
  {
    htmlPath: "leadership.html",
    className: "LeadershipPage",
    isFullDocument: true,
    expectedTitle: "Our Leadership - Grace and Praise Bangladeshi Church | GPBC",
    create: (page: Page) => new LeadershipPage(page)
  },
  {
    htmlPath: "ministries.html",
    className: "MinistriesPage",
    isFullDocument: true,
    expectedTitle: "Our Ministries - Grace and Praise Bangladeshi Church",
    create: (page: Page) => new MinistriesPage(page)
  },
  {
    htmlPath: "ministries/bible-study.html",
    className: "MinistriesBibleStudyPage",
    isFullDocument: true,
    expectedTitle: "Bible Study Ministry - Grace & Praise Bangladeshi Church",
    create: (page: Page) => new MinistriesBibleStudyPage(page)
  },
  {
    htmlPath: "ministries/community-development.html",
    className: "MinistriesCommunityDevelopmentPage",
    isFullDocument: true,
    expectedTitle: "Community Development - Grace & Praise Bangladeshi Church",
    create: (page: Page) => new MinistriesCommunityDevelopmentPage(page)
  },
  {
    htmlPath: "ministries/homeless-ministry.html",
    className: "MinistriesHomelessMinistryPage",
    isFullDocument: true,
    expectedTitle: "Homeless Ministry - Grace & Praise Bangladeshi Church",
    create: (page: Page) => new MinistriesHomelessMinistryPage(page)
  },
  {
    htmlPath: "ministries/hospital-ministry.html",
    className: "MinistriesHospitalMinistryPage",
    isFullDocument: true,
    expectedTitle: "Hospital Ministry - Grace & Praise Bangladeshi Church",
    create: (page: Page) => new MinistriesHospitalMinistryPage(page)
  },
  {
    htmlPath: "ministries/index.html",
    className: "MinistriesIndexPage",
    isFullDocument: true,
    expectedTitle: "Our Ministries | Grace & Praise Bangladeshi Church",
    create: (page: Page) => new MinistriesIndexPage(page)
  },
  {
    htmlPath: "ministries/kids-ministry.html",
    className: "MinistriesKidsMinistryPage",
    isFullDocument: true,
    expectedTitle: "Kids Ministry - Grace & Praise Bangladeshi Church",
    create: (page: Page) => new MinistriesKidsMinistryPage(page)
  },
  {
    htmlPath: "ministries/men-fellowship.html",
    className: "MinistriesMenFellowshipPage",
    isFullDocument: true,
    expectedTitle: "Men Fellowship - Grace & Praise Bangladeshi Church",
    create: (page: Page) => new MinistriesMenFellowshipPage(page)
  },
  {
    htmlPath: "ministries/mission-outreach.html",
    className: "MinistriesMissionOutreachPage",
    isFullDocument: true,
    expectedTitle: "Mission Outreach - Grace & Praise Bangladeshi Church",
    create: (page: Page) => new MinistriesMissionOutreachPage(page)
  },
  {
    htmlPath: "ministries/prison-ministry.html",
    className: "MinistriesPrisonMinistryPage",
    isFullDocument: true,
    expectedTitle: "Prison Ministry - Grace & Praise Bangladeshi Church",
    create: (page: Page) => new MinistriesPrisonMinistryPage(page)
  },
  {
    htmlPath: "ministries/support-missionaries.html",
    className: "MinistriesSupportMissionariesPage",
    isFullDocument: true,
    expectedTitle: "Support Missionaries - Grace & Praise Bangladeshi Church",
    create: (page: Page) => new MinistriesSupportMissionariesPage(page)
  },
  {
    htmlPath: "ministries/worship-ministry.html",
    className: "MinistriesWorshipMinistryPage",
    isFullDocument: true,
    expectedTitle: "Worship Ministry - Grace & Praise Bangladeshi Church",
    create: (page: Page) => new MinistriesWorshipMinistryPage(page)
  },
  {
    htmlPath: "ministries/youth-ministry.html",
    className: "MinistriesYouthMinistryPage",
    isFullDocument: true,
    expectedTitle: "Youth Ministry - Grace & Praise Bangladeshi Church",
    create: (page: Page) => new MinistriesYouthMinistryPage(page)
  },
  {
    htmlPath: "mission.html",
    className: "MissionPage",
    isFullDocument: true,
    expectedTitle: "Our Mission - Grace and Praise Bangladeshi Church | GPBC",
    create: (page: Page) => new MissionPage(page)
  },
  {
    htmlPath: "navigation-template.html",
    className: "NavigationTemplatePage",
    isFullDocument: false,
    expectedTitle: undefined,
    create: (page: Page) => new NavigationTemplatePage(page)
  },
  {
    htmlPath: "partials/footer.html",
    className: "PartialsFooterPage",
    isFullDocument: false,
    expectedTitle: undefined,
    create: (page: Page) => new PartialsFooterPage(page)
  },
  {
    htmlPath: "partials/header.html",
    className: "PartialsHeaderPage",
    isFullDocument: false,
    expectedTitle: undefined,
    create: (page: Page) => new PartialsHeaderPage(page)
  },
  {
    htmlPath: "plan-visit.html",
    className: "PlanVisitPage",
    isFullDocument: true,
    expectedTitle: "Plan Your Visit | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new PlanVisitPage(page)
  },
  {
    htmlPath: "position-papers.html",
    className: "PositionPapersPage",
    isFullDocument: true,
    expectedTitle: "Position Papers - Grace and Praise Bangladeshi Church | GPBC",
    create: (page: Page) => new PositionPapersPage(page)
  },
  {
    htmlPath: "prayer-request.html",
    className: "PrayerRequestPage",
    isFullDocument: true,
    expectedTitle: "Prayer Request | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new PrayerRequestPage(page)
  },
  {
    htmlPath: "privacy-policy.html",
    className: "PrivacyPolicyPage",
    isFullDocument: true,
    expectedTitle: "Privacy Policy - Grace and Praise Bangladeshi Church",
    create: (page: Page) => new PrivacyPolicyPage(page)
  },
  {
    htmlPath: "redesign-mockup.html",
    className: "RedesignMockupPage",
    isFullDocument: true,
    expectedTitle: "Grace and Praise Bangladeshi Church - San Bernardino, CA",
    create: (page: Page) => new RedesignMockupPage(page)
  },
  {
    htmlPath: "shape-sections.html",
    className: "ShapeSectionsPage",
    isFullDocument: false,
    expectedTitle: undefined,
    create: (page: Page) => new ShapeSectionsPage(page)
  },
  {
    htmlPath: "sms-opt-in.html",
    className: "SmsOptInPage",
    isFullDocument: true,
    expectedTitle: "SMS Opt-In – Grace and Praise Bangladeshi Church",
    create: (page: Page) => new SmsOptInPage(page)
  },
  {
    htmlPath: "songbook.html",
    className: "SongbookPage",
    isFullDocument: true,
    expectedTitle: "GPBC Song Book - Grace and Praise Bangladeshi Church",
    create: (page: Page) => new SongbookPage(page)
  },
  {
    htmlPath: "terms-conditions.html",
    className: "TermsConditionsPage",
    isFullDocument: true,
    expectedTitle: "Terms & Conditions - Grace and Praise Bangladeshi Church",
    create: (page: Page) => new TermsConditionsPage(page)
  },
  {
    htmlPath: "test-connection.html",
    className: "TestConnectionPage",
    isFullDocument: true,
    expectedTitle: "Test Google Sheets Connection",
    create: (page: Page) => new TestConnectionPage(page)
  },
  {
    htmlPath: "testimonies.html",
    className: "TestimoniesPage",
    isFullDocument: true,
    expectedTitle: "Testimonies - Grace and Praise Bangladeshi Church | GPBC",
    create: (page: Page) => new TestimoniesPage(page)
  },
  {
    htmlPath: "translate-test.html",
    className: "TranslateTestPage",
    isFullDocument: true,
    expectedTitle: "Translation Test",
    create: (page: Page) => new TranslateTestPage(page)
  },
  {
    htmlPath: "youth-devotion.html",
    className: "YouthDevotionPage",
    isFullDocument: true,
    expectedTitle: "Youth Devotion | Grace and Praise Bangladeshi Church",
    create: (page: Page) => new YouthDevotionPage(page)
  },
  {
    htmlPath: "youth/games/index.html",
    className: "YouthGamesIndexPage",
    isFullDocument: true,
    expectedTitle: "Youth Games | GPBC",
    create: (page: Page) => new YouthGamesIndexPage(page)
  }
];

export const htmlPagePaths = pageRegistry.map((entry) => entry.htmlPath);
export const htmlPageCount = pageRegistry.length;

const pageFactoryByPath = new Map(pageRegistry.map((entry) => [entry.htmlPath, entry.create]));

export function createPageByPath(page: Page, htmlPath: string): BasePage {
  const factory = pageFactoryByPath.get(htmlPath);
  if (!factory) {
    throw new Error('No POM registered for path: ' + htmlPath);
  }
  return factory(page);
}
