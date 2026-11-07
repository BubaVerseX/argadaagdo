import { nativeTranslations } from "@/lib/i18nNative";

export const supportedLanguages = ["en", "ka"] as const;

export type Language = (typeof supportedLanguages)[number];

// Georgian first: most visitors are in Georgia, and the server renders this
// language before the saved choice is read.
export const defaultLanguage: Language = "ka";

export const languageNames: Record<Language, string> = {
  en: "🇬🇧 English",
  ka: "🇬🇪 ქართული",
};

export const languageShortNames: Record<Language, string> = {
  en: "English",
  ka: "ქართული",
};

const translations = {
  en: {
    ...nativeTranslations.en,
    "brand.name": "ArGadaagdo",
    "brand.tagline": "Food rescue marketplace",

    "nav.home": "Home",
    "nav.customerSection": "Customer",
    "nav.businessSection": "Business",
    "nav.adminSection": "Admin",
    "nav.offers": "Offers",
    "nav.businesses": "Businesses",
    "nav.discover": "Discover",
    "nav.orders": "Orders",
    "nav.favorites": "Favorites",
    "nav.faq": "FAQ",
    "nav.support": "Support",
    "nav.contact": "Contact",
    "nav.about": "About",
    "nav.mission": "Our mission",
    "nav.privacy": "Privacy",
    "nav.terms": "Terms",
    "nav.profile": "Profile",
    "nav.settings": "Settings",
    "nav.dashboard": "Business dashboard",
    "nav.admin": "Admin",
    "nav.forBusiness": "For businesses",
    "nav.more": "More",
    "nav.logout": "Logout",
    "nav.signIn": "Sign in",
    "nav.openMenu": "Open menu",
    "nav.closeMenu": "Close menu",
    "nav.dashboardTab": "Dashboard",
    "nav.notifications": "Notifications",
    "nav.noNotifications": "No new notifications yet.",
    "language.switcherLabel": "Choose language",

    "common.loading": "Loading...",
    "common.openMap": "Open map",
    "common.browseOffers": "Discover",
    "common.viewDetails": "View details",
    "common.reserve": "Reserve",
    "common.cancel": "Cancel",
    "common.remove": "Remove",
    "common.save": "Save",
    "common.available": "Available",
    "common.unavailable": "Unavailable",
    "common.soldOut": "Sold out",
    "common.expired": "Expired",
    "common.price": "Price",
    "common.pending": "Pending",
    "common.pickup": "Pickup",
    "common.quantity": "Quantity",
    "common.category": "Category",
    "common.size": "Size",
    "common.greenBag": "Lunch Box",
    "common.greenBags": "Lunch Boxes",
    "common.rating": "Rating",
    "common.reviews": "Reviews",
    "common.noRatings": "No ratings yet",
    "common.noReviews": "No reviews yet",
    "common.noWrittenReview": "No written review.",
    "common.business": "Business",
    "common.businessUnavailable": "Business unavailable",
    "common.addressUnavailable": "Address unavailable",
    "common.offerUnavailable": "Offer unavailable",
    "common.today": "Today",
    "common.tomorrow": "Tomorrow",
    "common.upcoming": "Upcoming",
    "common.food": "Food",

    "home.badge": "Tbilisi’s food rescue marketplace",
    "home.title1": "Save money on great food.",
    "home.title2": "Rescue food.",
    "home.title3": "Support local businesses.",
    "home.subtitle":
      "Discounted Lunch Boxes in Tbilisi.",
    "home.explore": "Discover",
    "home.joinBusiness": "For businesses",
    "home.pickupOnly": "pickup only",
    "home.onlinePayment": "pilot reservations",
    "home.trustVerified": "Verified businesses",
    "home.trustEasyPickup": "Easy pickup",
    "home.trustLocalBusinesses": "Local businesses",
    "home.trustFoodRescue": "Food rescue",
    "home.trustEasyPickupProcess": "Easy pickup process",
    "home.trustReduceFoodWaste": "Reduce food waste",
    "home.trustPickupOnlyMarketplace": "Pickup-only marketplace",
    "home.trustPickupCodeVerification": "Pickup code verification",
    "home.trustCustomerRatings": "Customer ratings",
    "home.trustSecureReservationFlow": "Secure reservation flow",
    "home.trustLocalTbilisiBusinesses": "Local Tbilisi businesses",
    "home.featuredOffer": "Featured offer",
    "home.topBusinesses": "Top-rated businesses",
    "home.stats": "Pilot trust",
    "home.howItWorks": "How ArGadaagdo works",
    "home.howItWorksIntro":
      "A simple pickup-only flow for discounted Lunch Boxes from local businesses.",
    "home.step1": "Step 1",
    "home.step1Text": "Browse Lunch Boxes of food from local businesses.",
    "home.step2": "Step 2",
    "home.step2Text": "Reserve a box before it sells out.",
    "home.step3": "Step 3",
    "home.step3Text": "Pick it up during the pickup window.",
    "home.step4": "Step 4",
    "home.step4Text": "Enjoy great food and help reduce waste.",
    "home.trustTitle": "Reviewed local businesses",
    "home.trustMessage":
      "All businesses are reviewed before being approved on ArGadaagdo.",
    "home.trustCardVerifiedTitle": "Verified businesses",
    "home.trustCardVerifiedText": "Every business is reviewed before approval.",
    "home.trustCardPickupTitle": "Pickup only",
    "home.trustCardPickupText": "Reserve online and collect in person.",
    "home.trustCardLocalTitle": "Local marketplace",
    "home.trustCardLocalText": "Focused on Tbilisi pilot businesses.",
    "home.trustCardWasteTitle": "Reduce food waste",
    "home.trustCardWasteText": "Help save good food from being thrown away.",
    "home.whyBadge": "Why it matters",
    "home.whyUse": "Why use ArGadaagdo?",
    "home.whySaveMoney": "Save money on food",
    "home.whyReduceWaste": "Reduce food waste",
    "home.whySupportLocal": "Support local businesses",
    "home.whyDiscoverTbilisi": "Discover new places in Tbilisi",
    "home.noFeatured": "No featured offers yet.",
    "home.pickupWindows": "Pickup windows",
    "home.noSurpriseBags": "No Lunch Boxes available right now.",
    "home.publishLater": "Businesses usually publish offers later in the day.",
    "home.missionBadge": "Pilot launch",
    "home.missionTitle": "Why ArGadaagdo?",
    "home.missionIntro": "Every day, good food goes unsold.",
    "home.missionText":
      "Less waste, lower prices.",
    "home.missionCustomer": "Customers save money.",
    "home.missionBusiness": "Businesses earn from unsold food.",
    "home.missionWaste": "Less food ends up in the trash.",
    "home.businessCtaBadge": "For businesses",
    "home.businessCtaTitle": "Own a bakery, cafe or restaurant?",
    "home.businessCtaText":
      "Join ArGadaagdo and turn surplus food into additional revenue.",
    "home.moreBusinessesJoiningSoon": "More businesses joining soon",
    "home.moreBusinessesJoiningSoonText":
      "ArGadaagdo is launching carefully with verified local businesses in Tbilisi.",
    "home.registerBusiness": "Register your business",
    "home.customerCtaBadge": "For customers",
    "home.customerCtaTitle": "Great food, great price",
    "home.customerCtaText":
      "Save money and cut waste.",
    "home.finalCtaTitle": "Ready to rescue food?",
    "home.finalCtaText": "Browse today's Lunch Boxes.",

    "customerOnboarding.title": "New to ArGadaagdo?",
    "customerOnboarding.stepBrowse": "Browse Lunch Boxes.",
    "customerOnboarding.stepReserve": "Reserve before they sell out.",
    "customerOnboarding.stepCollect": "Collect during pickup time.",
    "customerOnboarding.stepEnjoy": "Enjoy great food at a lower price.",

    "offers.title": "Rescue Lunch Boxes near you.",
    "offers.filterHint":
      "Use search, categories and sorting to find the right pickup window.",
    "offers.search": "Search food, business, address...",
    "offers.reset": "Reset",
    "offers.allCategories": "All categories",
    "offers.sortNewest": "Newest first",
    "offers.sortLowest": "Lowest price",
    "offers.sortHighest": "Highest price",
    "offers.availableOnly": "Available only",
    "offers.tbilisiPilot": "Tbilisi pilot",
    "offers.heading": "Food rescue offers",
    "offers.matches": "matches your filters.",
    "offers.noMatching": "No matching offers",
    "offers.clearFilters": "Clear filters",
    "offers.addFavorite": "Add to favorites",
    "offers.removeFavorite": "Remove from favorites",

    "offerDetail.back": "Back to offers",
    "offerDetail.allergens": "Allergens",
    "offerDetail.allergensAsk": "Ask the business during pickup.",
    "offerDetail.reviewsTitle": "Customer reviews",
    "offerDetail.savings": "You save",
    "offerDetail.noSavingsListed": "Not listed",
    "offerDetail.pickupDate": "Pickup date",
    "offerDetail.pickupTime": "Pickup time",
    "offerDetail.afterReservationOrder": "Your reservation appears in Orders.",
    "offerDetail.afterReservationCode": "You receive a pickup code.",
    "offerDetail.afterReservationVisit": "Visit during pickup time.",
    "offerDetail.afterReservationShowCode":
      "Show the pickup code to collect your order.",
    "offerDetail.cancellationReminderTitle": "Cancellation reminder",
    "offerDetail.ratingReminderText":
      "You can rate after pickup.",
    "offerDetail.notFound": "This box is no longer available.",

    "businessProfile.back": "Back to offers",
    "businessProfile.title": "Business profile",
    "businessProfile.verified": "Verified business",
    "businessProfile.businessType": "Business type",
    "businessProfile.address": "Address",
    "businessProfile.activeOffers": "Active offers",
    "businessProfile.activeOffersHint": "Available now",
    "businessProfile.customerReviews": "Customer reviews",
    "businessProfile.outOfFive": "out of 5",
    "businessProfile.trustTitle": "Approved on ArGadaagdo",
    "businessProfile.trustMessage":
      "This business has been approved to sell offers on ArGadaagdo.",
    "businessProfile.localBusinessTitle": "Local food business",
    "businessProfile.localBusinessText":
      "This profile helps customers understand who prepares the Lunch Boxes.",
    "businessProfile.pickupOnlyTitle": "Pickup-only offers",
    "businessProfile.pickupOnlyText":
      "Reserve online, collect in store.",
    "businessProfile.reviewsIntro":
      "Reviews from completed pickups.",
    "businessProfile.noActiveOffers": "No active Lunch Boxes right now.",
    "businessProfile.noActiveOffersHint":
      "Check back later for fresh food rescue offers from this business.",
    "businessProfile.noReviewsHint":
      "Reviews will appear here after customers complete pickups and rate this business.",
    "businessProfile.notFound": "This business could not be found.",

    "reviewReport.link": "Report",
    "reviewReport.title": "What's wrong with this review?",
    "reviewReport.reasonOffensive": "Offensive",
    "reviewReport.reasonSpam": "Spam",
    "reviewReport.reasonFalse": "False",
    "reviewReport.reasonOther": "Other",
    "reviewReport.commentLabel": "Comment (optional)",
    "reviewReport.commentPlaceholder": "Tell us more",
    "reviewReport.send": "Send",
    "reviewReport.sending": "Sending...",
    "reviewReport.chooseReason": "Please choose a reason.",
    "reviewReport.thanks": "Thank you. We've received your report and will take a look.",
    "reviewReport.alreadyReported": "You've already reported this review.",
    "reviewReport.failed": "Your report could not be sent. Please try again.",

    "orders.reserved": "Reserved",
    "orders.collected": "Collected",
    "orders.cancelled": "Cancelled",
    "orders.pickupCode": "Pickup code",
    "orders.cancelPolicy": "You can cancel up to 2 hours before pickup for a full refund.",
    "orders.pickupUnavailable": "Pickup details unavailable",
    "orders.statusGuideReservedTitle": "Reserved",
    "orders.statusGuideReservedText":
      "Your pickup code is active. Visit the business during the pickup window.",
    "orders.statusGuideCollectedTitle": "Collected",
    "orders.statusGuideCollectedText":
      "The business verified your code and completed the pickup.",
    "orders.statusGuideCancelledTitle": "Cancelled",
    "orders.statusGuideCancelledText":
      "Cancelled or refunded reservations remain here for your history.",
    "orders.reviewThanks": "Thank you for your review.",
    "orders.ratePickup": "Rate this pickup",
    "orders.reviewPlaceholder": "Optional review for the business",
    "orders.reviewLabel": "Write your review",
    "orders.submitReview": "Submit review",

    "favorites.badge": "Saved offers",
    "favorites.title": "Your favorite Lunch Boxes.",
    "favorites.subtitle": "Your saved offers in one place.",
    "favorites.saved": "Saved",
    "favorites.loading": "Loading your favorites...",
    "favorites.emptyTitle": "No saved offers yet",
    "favorites.emptyHint": "Save interesting Lunch Boxes and find them here later.",
    "favorites.educationTitle": "Save offers for later",
    "favorites.educationText":
      "Use Favorites to keep track of Lunch Boxes you might want to reserve later.",
    "favorites.trustReminder":
      "Offers may sell out quickly. Reserve early if you find something you like.",
    "favorites.viewOffer": "View offer",
    "favorites.offerUnavailable": "Offer no longer available",
    "favorites.offerEndedHint":
      "This saved offer may have ended, sold out, or become unavailable.",

    "businessDashboard.title": "Manage offers and pickups.",
    "businessDashboard.subtitle": "Publish bags and hand over orders.",
    "businessDashboard.welcome": "Welcome back",
    "businessDashboard.welcomeText":
      "Manage your offers, reservations and customer feedback from one place.",
    "businessDashboard.businessOwner": "Business owner",
    "businessDashboard.stats": "Business stats",
    "businessDashboard.statsIntro":
      "Reservations, pickups, ratings.",
    "businessDashboard.emptyAnalytics":
      "Statistics will appear as customers interact with your offers.",
    "businessDashboard.createOffer": "Create offer",
    "businessDashboard.createOfferButton": "Create offer",
    "businessDashboard.publishing": "Publishing...",
    "businessDashboard.selectedImage": "Selected image",
    "businessDashboard.created": "Created",
    "businessDashboard.customer": "Customer",
    "businessDashboard.reliability": "Reliability",
    "businessDashboard.myOffers": "My offers",
    "businessDashboard.reservations": "Reservations",
    "businessDashboard.businessReviews": "Business reviews",
    "businessDashboard.activeOffersMetric": "Active offers",
    "businessDashboard.activeOffersHelper":
      "Offers currently visible to customers",
    "businessDashboard.totalOffersMetric": "Total offers",
    "businessDashboard.totalOffersHelper": "All offers created by this business",
    "businessDashboard.totalReservationsMetric": "Total reservations",
    "businessDashboard.totalReservationsHelper":
      "Customer reservations received",
    "businessDashboard.completedPickupsMetric": "Completed pickups",
    "businessDashboard.completedPickupsHelper":
      "Orders successfully collected",
    "businessDashboard.cancelledReservationsMetric": "Cancelled reservations",
    "businessDashboard.cancelledReservationsHelper":
      "Reservations cancelled by customers",
    "businessDashboard.averageRating": "Average rating",
    "businessDashboard.averageRatingHelper": "Customer satisfaction score",
    "businessDashboard.totalReviews": "Total reviews",
    "businessDashboard.reservationSummary": "Reservation summary",
    "businessDashboard.reservationSummaryHint":
      "A quick view of which reservations still need attention.",
    "businessDashboard.noShow": "No-show",
    "businessDashboard.noReviews": "No ratings yet.",
    "businessDashboard.noOffers": "Create your first Lunch Box.",
    "businessDashboard.noReservations": "No reservations yet.",
    "businessDashboard.noOffersHint":
      "Your offers will appear here after creation.",
    "businessDashboard.noReservationsHint":
      "Customers who reserve your offers will appear here.",
    "businessDashboard.noReviewsHint":
      "Ratings appear after completed pickups.",
    "businessDashboard.noFilteredReservations": "No reservations match this filter.",
    "businessDashboard.noFilteredReservationsHint":
      "Try another reservation status to see more results.",
    "businessDashboard.createFirstOffer": "Create first offer",
    "businessDashboard.viewReservations": "View reservations",
    "businessOnboarding.badge": "Pilot onboarding",
    "businessOnboarding.welcomeTitle": "Welcome to ArGadaagdo.",
    "businessOnboarding.welcomeText":
      "Create your first Lunch Box.",
    "businessOnboarding.createFirstBag": "Create your first Lunch Box",
    "businessOnboarding.workflowBadge": "Business guide",
    "businessOnboarding.workflowTitle": "How ArGadaagdo works",
    "businessOnboarding.workflowCreateOffer": "Create an offer.",
    "businessOnboarding.workflowReceiveReservations": "Receive reservations.",
    "businessOnboarding.workflowVerifyPickupCode": "Verify pickup code.",
    "businessOnboarding.workflowCompletePickup": "Complete pickup.",
    "businessOnboarding.workflowReceiveRatings": "Receive ratings.",
    "businessOnboarding.checklistBadge": "Quick start",
    "businessOnboarding.checklistTitle": "Getting started",
    "businessOnboarding.step": "Step",
    "businessOnboarding.checkCreateOffer": "Create an offer",
    "businessOnboarding.checkFirstReservation": "Wait for reservations",
    "businessOnboarding.checkFirstPickup": "Verify pickup code",
    "businessOnboarding.checkFirstRating": "Receive ratings",
    "businessOnboarding.tipsBadge": "Tips for success",
    "businessOnboarding.tipsTitle": "Simple ways to sell better",
    "businessOnboarding.tipPublishEarly": "Publish offers a few hours before closing.",
    "businessOnboarding.tipClearNames": "Use clear offer names.",
    "businessOnboarding.tipAccurateTimes": "Keep pickup times accurate.",
    "businessOnboarding.tipPromptPickup": "Serve customers promptly at pickup.",
    "businessOnboarding.firstOfferGuidanceTitle": "First offer guidance",
    "businessOnboarding.recommendedQuantity": "Recommended quantity",
    "businessOnboarding.recommendedQuantityValue": "3-10 Lunch Boxes",
    "businessOnboarding.recommendedPickupWindow": "Pickup window",
    "businessOnboarding.recommendedPickupWindowValue": "1-2 hours",
    "businessOnboarding.recommendedTitle": "Clear title example",
    "businessOnboarding.recommendedTitleValue": "Bakery Lunch Box",
    "businessOnboarding.realExamplesTitle": "Realistic offer examples",
    "businessOnboarding.realExamplesText":
      "For example: Bakery Lunch Box.",
    "businessOnboarding.titleHelper":
      "Title: use a clear customer-friendly name, for example Bakery Lunch Box.",
    "businessOnboarding.quantityHelper":
      "Quantity: how many customers can reserve this offer.",
    "businessOnboarding.pickupWindowHelper":
      "Pickup window: when customers can collect. A clear 1-2 hour window works best.",
    "businessOnboarding.offerValidationHint":
      "Check the details before publishing.",
    "businessOnboarding.reservationGuidanceTitle": "How reservations work",
    "businessOnboarding.reservationGuidanceText":
      "Check the code before handing over food.",
    "businessOnboarding.reservationCardHint":
      "Each card shows customer, status and time.",
    "businessOnboarding.pickupVerificationTitle": "Pickup verification",
    "businessOnboarding.pickupVerificationText":
      "Ask for the code and confirm on the card.",
    "businessOnboarding.pickupStepAskCode": "Ask for the customer code",
    "businessOnboarding.pickupStepEnterCode": "Enter it in the verification modal",
    "businessOnboarding.pickupStepComplete": "Complete pickup only after it matches",
    "businessOnboarding.ratingsGuidanceTitle": "Why ratings matter",
    "businessOnboarding.ratingsGuidanceText":
      "Good ratings help customers trust your business and improve future reservations.",

    "admin.title": "Admin dashboard",
    "admin.subtitle": "Review business approvals and monitor the food rescue marketplace.",
    "admin.pendingBusinesses": "Pending businesses",
    "admin.analytics": "Analytics snapshot",

    "login.title": "Welcome back",
    "login.email": "Email",
    "login.password": "Password",
    "login.signIn": "Sign in",
    "login.signUp": "Create account",
    "login.formHint": "Use the same form to create an account or sign in.",
    "login.signInTitle": "Sign in to ArGadaagdo",
    "login.signInHint": "Enter your email and password to continue.",
    "login.signUpTitle": "Create your account",
    "login.signUpHint": "Enter your email and a password.",
    "login.signInModeHelper": "Existing account",
    "login.signUpModeHelper": "New account",
    "login.alreadyHaveAccount": "Already have an account?",
    "login.dontHaveAccount": "Don't have an account?",
    "login.redirectCheckout": "Please sign in to reserve this offer.",
    "login.redirectOrders": "Please sign in to view your orders.",
    "login.redirectFavorites": "Please sign in to view your saved offers.",
    "login.accountTypeHint":
      "Choose Customer if you want to reserve food offers. Choose Business if you will publish offers for a cafe, bakery, restaurant or shop.",
    "login.customer": "Customer",
    "login.business": "Business",
    "login.customerHint": "Reserve food offers.",
    "login.businessHint": "Create and manage offers.",
    "login.forCustomers": "For customers",
    "login.forCustomersText": "Reserve discounted Lunch Boxes and collect them in person.",
    "login.businessTitle": "Business sign in",
    "login.businessLink": "Are you a business? Sign in here",
    "login.forBusinessesText": "Create pickup-only offers and manage customer reservations.",

    "businessRegister.badge": "For local businesses",
    "businessRegister.title": "Register your food business",
    "businessRegister.subtitle":
      "4 steps. Then we review it.",
    "businessRegister.step1": "1. Submit business",
    "businessRegister.step1Text": "Add your name, type, address and phone number.",
    "businessRegister.step2": "2. Wait for approval",
    "businessRegister.step2Text": "Admin reviews and approves your business.",
    "businessRegister.step3": "3. Publish offers",
    "businessRegister.step3Text": "Create pickup-only food rescue offers.",
    "businessRegister.details": "Business details",
    "businessRegister.detailsHint":
      "Use real information customers and admins can recognize during the Tbilisi pilot.",
    "businessRegister.requiredInfoTitle": "What you need",
    "businessRegister.requiredNameType": "Business name and business type",
    "businessRegister.requiredAddress": "Pickup address in Tbilisi",
    "businessRegister.requiredPhone": "Phone number for admin follow-up",
    "businessRegister.expectationsTitle": "What happens next",
    "businessRegister.expectationsText":
      "We review each application by hand.",
    "businessRegister.name": "Business name",
    "businessRegister.address": "Address in Tbilisi",
    "businessRegister.phone": "Phone number",
    "businessRegister.submitting": "Submitting...",
    "businessRegister.checking": "Checking account...",
    "businessRegister.submit": "Submit for approval",

    "forBusinesses.metaBadge": "For businesses",
    "forBusinesses.heroTitle": "Your unsold food still has value.",
    "forBusinesses.heroSubtitle":
      "Sell your surplus food as bags.",
    "forBusinesses.heroCtaRegister": "Register your business",
    "forBusinesses.heroCtaContact": "Talk to us first",
    "forBusinesses.problemBadge": "The problem",
    "forBusinesses.problemTitle": "Good food gets thrown out",
    "forBusinesses.problemText":
      "End-of-day food often goes in the bin.",
    "forBusinesses.solutionBadge": "The solution",
    "forBusinesses.solutionTitle": "List it. Sell it.",
    "forBusinesses.solutionListTitle": "List in a minute",
    "forBusinesses.solutionListText":
      "Price, quantity, pickup time. That's it.",
    "forBusinesses.solutionReachTitle": "Reach new customers",
    "forBusinesses.solutionReachText":
      "Reach new customers nearby.",
    "forBusinesses.solutionRecoverTitle": "Recover real revenue",
    "forBusinesses.solutionRecoverText":
      "Prepaid orders instead of written-off food.",
    "forBusinesses.howBadge": "How it works",
    "forBusinesses.howTitle": "From surplus to sold",
    "forBusinesses.howStep1Title": "Register your business",
    "forBusinesses.howStep1Text":
      "Your company and pickup location.",
    "forBusinesses.howStep2Title": "Publish a Lunch Box",
    "forBusinesses.howStep2Text":
      "Price, quantity, pickup time.",
    "forBusinesses.howStep3Title": "Get reserved and paid",
    "forBusinesses.howStep3Text":
      "Customers pay online the moment they reserve. It lands in your dashboard immediately.",
    "forBusinesses.howStep4Title": "Hand it over",
    "forBusinesses.howStep4Text":
      "The customer shows a code; you confirm.",
    "forBusinesses.commissionBadge": "Pricing, in plain terms",
    "forBusinesses.commissionTitle": "No monthly fee.",
    "forBusinesses.commissionText": "You pay a commission only on boxes you sell.",
    "forBusinesses.commissionNoSale": "No sale, no fee",
    "forBusinesses.commissionNoSaleText":
      "You only pay a commission once a box is actually reserved and paid for.",
    "forBusinesses.ctaTitle": "Ready to stop throwing food away?",
    "forBusinesses.ctaText":
      "Turn surplus food into sales instead of waste.",
    "forBusinesses.ctaRegister": "Register your business",
    "forBusinesses.ctaQuestions": "Have questions first?",
    "forBusinesses.ctaContact": "Contact us",

    "checkout.rescueBox": "Lunch Box",
    "checkout.noShowWarning": "No-show warning",
    "checkout.noShowText": "If you do not pick up your order, it may count as a no-show.",
    "checkout.reserving": "Creating secure checkout...",
    "checkout.successMessage":
      "Reservation confirmed. Your pickup code is in Orders.",
    "checkout.afterConfirmation": "After confirmation",
    "checkout.ordersReminder":
      "Your reservation will appear in Orders after confirmation.",
    "checkout.ratingReminder":
      "After pickup, you can rate your experience and help other customers.",
    "checkout.trustSecureReservation": "Secure reservation",
    "checkout.pickupGuideBadge": "Pickup guide",
    "checkout.pickupGuideTitle": "How pickup works",
    "checkout.pickupGuideIntro":
      "Your pickup code is the proof of reservation. Keep it ready when you arrive.",
    "checkout.pickupStep1": "Step 1",
    "checkout.pickupStep1Text": "Reserve your Lunch Box.",
    "checkout.pickupStep2": "Step 2",
    "checkout.pickupStep2Text": "Receive your pickup code.",
    "checkout.pickupStep3": "Step 3",
    "checkout.pickupStep3Text": "Visit the business during the pickup window.",
    "checkout.pickupStep4": "Step 4",
    "checkout.pickupStep4Text": "Show your pickup code to collect your order.",

    "faq.badge": "Trust center",
    "faq.title": "Questions about ArGadaagdo",
    "faq.subtitle":
      "Short answers.",
    "faq.trustLabel": "Reviewed businesses",
    "faq.trustText":
      "We review businesses before approval.",
    "faq.pickupText":
      "Every reservation has a pickup code.",
    "faq.ratingText":
      "Customers can rate completed pickups, helping future customers choose confidently.",
    "faq.customers": "For customers",
    "faq.businesses": "For businesses",
    "faq.general": "General",
    "faq.customer.what.question": "What is ArGadaagdo?",
    "faq.customer.what.answer":
      "ArGadaagdo is a Georgian food rescue marketplace where local businesses can sell leftover food as discounted Lunch Boxes instead of wasting it.",
    "faq.customer.reservations.question": "How do reservations work?",
    "faq.customer.reservations.answer":
      "Browse available Lunch Boxes, open an offer, continue to checkout, and confirm your reservation. After confirmation, the order appears on your Orders page.",
    "faq.customer.pickups.question": "How do pickups work?",
    "faq.customer.pickups.answer":
      "Pick up your order directly from the business during the pickup window. Show your pickup code so the business can verify and complete the order.",
    "faq.customer.cancel.question": "Can I cancel my reservation?",
    "faq.customer.cancel.answer":
      "Yes. You can cancel up to 2 hours before pickup. After that deadline, cancellation may no longer be available.",
    "faq.customer.miss.question": "What happens if I miss pickup?",
    "faq.customer.miss.answer":
      "If you do not collect a reserved order during the pickup window, it may count as a no-show. This helps protect businesses from unreliable reservations.",
    "faq.customer.ratings.question": "How do ratings work?",
    "faq.customer.ratings.answer":
      "After a completed pickup, customers can rate the business and optionally leave a review. Ratings help other customers discover reliable places.",
    "faq.business.join.question": "How do I join ArGadaagdo?",
    "faq.business.join.answer":
      "Open \"For businesses\" at the bottom of the site, create a business account and complete the 4 registration steps.",
    "faq.business.approval.question": "How does approval work?",
    "faq.business.approval.answer":
      "An admin reviews submitted businesses before they can publish offers. This keeps the marketplace safer and more trustworthy.",
    "faq.business.offers.question": "How do I create offers?",
    "faq.business.offers.answer":
      "After approval, open the Business Dashboard and create a Lunch Box with title, price, quantity, image, and pickup window.",
    "faq.business.collect.question": "How do customers collect orders?",
    "faq.business.collect.answer":
      "Customers show their pickup code at your business. You verify the code in the dashboard and mark the order collected.",
    "faq.general.tbilisi.question": "Is ArGadaagdo available outside Tbilisi?",
    "faq.general.tbilisi.answer":
      "The first target market is Tbilisi. Expansion to other Georgian cities can come later after the local pilot works well.",
    "faq.general.why.question": "Why does ArGadaagdo exist?",
    "faq.general.why.answer":
      "ArGadaagdo exists to help businesses recover value from unsold food, help customers save money, and reduce food waste in Georgia.",
    "faq.ctaTitle": "Ready to try ArGadaagdo?",
    "faq.ctaText":
      "Browse today's offers.",

    "contact.badge": "Contact & support",
    "contact.title": "Contact us",
    "contact.subtitle":
      "Have a question? Write to us.",
    "contact.ordersTitle": "Questions about an order?",
    "contact.ordersText":
      "Tell us what happened and your order details.",
    "contact.reservationsTitle": "Need help with a reservation?",
    "contact.reservationsText":
      "We can help with pickup questions, cancellations and account access.",
    "contact.businessTitle": "Interested in joining as a business?",
    "contact.businessText":
      "Run a food business? We'd love to hear from you.",
    "contact.supportEmailLabel": "Support email",
    "contact.emailTitle": "Reach ArGadaagdo support",
    "contact.emailText":
      "Email us about anything.",
    "contact.businessInquiriesLabel": "Business inquiries",
    "contact.businessInquiriesTitle": "Reduce waste and sell surplus food",
    "contact.businessInquiriesText":
      "Interested in reducing food waste and selling surplus food? Contact us to learn more.",
    "contact.responseTimeLabel": "Response time",
    "contact.responseTimeTitle": "1-2 business days",
    "contact.responseTimeText":
      "We aim to respond within 1-2 business days.",
    "contact.serviceAreaLabel": "Service area",
    "contact.serviceAreaTitle": "Tbilisi, Georgia",
    "contact.serviceAreaText": "ArGadaagdo is currently available in Tbilisi, Georgia.",
    "contact.footerTitle": "Want to keep exploring?",
    "contact.footerText":
      "Visit the FAQ for common questions or browse live food rescue offers in Tbilisi.",
    "contact.cta": "Contact support",

    "about.badge": "About ArGadaagdo",
    "about.title": "Reducing food waste in Georgia.",
    "about.subtitle":
      "A Georgian marketplace for rescuing food.",
    "about.whatLabel": "What is ArGadaagdo?",
    "about.whatTitle": "A food rescue marketplace",
    "about.whatText":
      "We connect you with shops that have food left over.",
    "about.launchAreaLabel": "Current launch area",
    "about.launchAreaTitle": "Tbilisi, Georgia",
    "about.launchAreaText":
      "Starting in Tbilisi, pickup only.",
    "about.missionLabel": "Mission",
    "about.missionTitle": "Simple goals, real impact",
    "about.missionSaveFood": "Save food.",
    "about.missionSaveMoney": "Save money.",
    "about.missionSupportLocal": "Support local businesses.",
    "about.ctaTitle": "Join the food rescue movement",
    "about.ctaText":
      "Discover offers or contact us.",

    "privacy.badge": "Privacy",
    "privacy.title": "Privacy Policy",
    "privacy.subtitle":
      "How ArGadaagdo collects, uses, shares and deletes your information. Last updated: 5 November 2026.",
    "privacy.infoTitle": "What information we collect",
    "privacy.infoText":
      "Account: your email address and password (stored only as a secure hash by our sign-in provider). Profile details you choose to add: display name and phone number. Activity: reservations, pickup codes, order and payment status, cancellations, pickups and no-shows, favorites, and ratings and review comments. Businesses: business name, type, address, phone, offer details and offer photos, and the bank account (IBAN) used for payouts, which businesses give us directly. Support: the messages you send us. We don't access your location or contacts, we only receive photos that a business chooses to upload for its offers, and we use no advertising or analytics trackers.",
    "privacy.verificationTitle": "Phone and business verification",
    "privacy.verificationText":
      "Customers: we require a mobile number, confirmed by an SMS code, before your first order, and one number can be used on one account only. The number and code are sent to our SMS provider, ubill.ge, only to deliver the code. Businesses: before approval we also collect the company's legal name, identification code and legal form, the owner's full name, a phone number confirmed by SMS, a TBC IBAN, and an extract from the Public Registry. The extract is kept in private storage that only our admins can read, and is used only to check the application. When you delete your account, your phone number, the owner's name and the extract are deleted; the company's legal name, identification code and IBAN are kept for payout records.",
    "privacy.accountTitle": "How we use it",
    "privacy.accountText":
      "To create and secure your account, show offers, take reservations and payments, let businesses verify pickups, send emails about your reservations (confirmations, pickup reminders, cancellations and refunds), keep the marketplace fair (for example a reliability score based on pickups, cancellations and no-shows), and answer support requests. We don't sell your information, show ads or track you across other apps and websites.",
    "privacy.paymentsTitle": "Payments",
    "privacy.paymentsText":
      "Card payments are handled by TBC Bank on its own secure payment page. ArGadaagdo never sees or stores your card details; we only receive the payment amount and status, and use them to confirm or refund your reservation.",
    "privacy.sharingTitle": "Who can see or receive your information",
    "privacy.sharingText":
      "The business you reserve from sees your reservation, your account email and your reliability score, so it can hand over your order. Ratings and review comments are shown publicly on the business's page without your name or email. Service providers process data for us only to run ArGadaagdo: Supabase (database, sign-in and file storage), our cloud hosting provider, Resend (email delivery) and TBC Bank (payments). They are required to protect it at least as well as we do. We may also disclose information when the law requires it.",
    "privacy.ordersTitle": "How long we keep it",
    "privacy.ordersText":
      "We keep your account information for as long as your account exists. Order and payment records are accounting records, so we keep them after an account is deleted, but they are no longer linked to you.",
    "privacy.deletionTitle": "Deleting your account",
    "privacy.deletionText":
      "You can delete your account at any time in the app: Settings → Delete my account. This permanently deletes your sign-in, email, profile details and favorites, and removes your review comments. Order and payment records are kept for accounting but no longer linked to you. Deleting a business account also hides the business and its offers. You can also email us to ask for a copy of your information, or to have it corrected or deleted.",
    "privacy.contactTitle": "Contact",
    "privacy.contactText":
      "Questions or requests about your information: argadaagdo.support@gmail.com. We aim to reply within 1–2 business days.",
    "privacy.helpTitle": "Questions about privacy?",
    "privacy.helpText":
      "Contact ArGadaagdo support if you have questions about account, order or business information.",

    "terms.badge": "Terms",
    "terms.title": "Terms of Use",
    "terms.subtitle":
      "These simple MVP terms explain the basic rules for reservations, pickups, cancellations, ratings and business approval.",
    "terms.reservationsTitle": "Reservations",
    "terms.reservationsText":
      "Customers reserve available Lunch Boxes from approved businesses. A reservation confirms your intention to collect the order during the listed pickup window.",
    "terms.pickupTitle": "Pickup responsibility",
    "terms.pickupText":
      "Customers are responsible for visiting the business during the pickup window and showing the pickup code from their Orders page.",
    "terms.cancellationTitle": "Cancellation policy",
    "terms.cancellationText":
      "Reservations may be cancelled only within the allowed cancellation window shown in the app. Late cancellations may not be available.",
    "terms.ratingsTitle": "Ratings and reviews",
    "terms.ratingsText":
      "Customers may rate completed pickups. Reviews should be honest, respectful and based on a real completed order.",
    "terms.businessApprovalTitle": "Business approval",
    "terms.businessApprovalText":
      "Businesses must be reviewed and approved before publishing offers. ArGadaagdo may move a business back to pending if additional review is needed.",
    "terms.helpTitle": "Need clarification?",
    "terms.helpText":
      "Visit the FAQ or contact support if you have questions about how ArGadaagdo works.",

    "footer.platform": "Platform",
    "footer.tbilisiFirst": "Tbilisi first",
    "footer.reduceWaste": "Reduce food waste",
    "footer.appStore": "Download on the App Store",
    "footer.reduceWasteGeorgia": "Reduce food waste in Georgia",

    "notFound.title": "Page not found",
    "notFound.text": "This page does not exist or the link is incorrect.",

    "offline.badge": "No connection",
    "offline.title": "You're offline",
    "offline.text":
      "No internet. Reconnect and try again.",
    "offline.retry": "Try again",
    "offline.home": "Go to homepage",

  },
  ka: {
    ...nativeTranslations.ka,
    "brand.name": "არ გადააგდო",
    "brand.tagline": "საკვების გადარჩენის პლატფორმა",

    "nav.home": "მთავარი",
    "nav.customerSection": "მომხმარებელი",
    "nav.businessSection": "ბიზნესი",
    "nav.adminSection": "ადმინი",
    "nav.offers": "შეთავაზებები",
    "nav.businesses": "ბიზნესები",
    "nav.discover": "აღმოჩენა",
    "nav.orders": "შეკვეთები",
    "nav.favorites": "რჩეულები",
    "nav.faq": "ხშირი კითხვები",
    "nav.support": "მხარდაჭერა",
    "nav.contact": "კონტაქტი",
    "nav.about": "ჩვენ შესახებ",
    "nav.mission": "ჩვენი მისია",
    "nav.privacy": "კონფიდენციალურობა",
    "nav.terms": "წესები",
    "nav.profile": "პროფილი",
    "nav.settings": "პარამეტრები",
    "nav.dashboard": "ბიზნეს პანელი",
    "nav.admin": "ადმინი",
    "nav.forBusiness": "ბიზნესისთვის",
    "nav.more": "მეტი",
    "nav.logout": "გასვლა",
    "nav.signIn": "შესვლა",
    "nav.openMenu": "მენიუს გახსნა",
    "nav.closeMenu": "მენიუს დახურვა",
    "nav.dashboardTab": "პანელი",
    "nav.notifications": "შეტყობინებები",
    "nav.noNotifications": "ახალი შეტყობინებები არ არის.",
    "language.switcherLabel": "ენის არჩევა",

    "common.loading": "იტვირთება...",
    "common.openMap": "რუკის გახსნა",
    "common.browseOffers": "აღმოჩენა",
    "common.viewDetails": "დეტალების ნახვა",
    "common.reserve": "დაჯავშნა",
    "common.cancel": "გაუქმება",
    "common.remove": "წაშლა",
    "common.save": "შენახვა",
    "common.available": "ხელმისაწვდომია",
    "common.unavailable": "მიუწვდომელია",
    "common.soldOut": "გაყიდულია",
    "common.expired": "ვადაგასულია",
    "common.price": "ფასი",
    "common.pending": "მოლოდინში",
    "common.pickup": "წაღება",
    "common.quantity": "რაოდენობა",
    "common.category": "კატეგორია",
    "common.size": "ზომა",
    "common.greenBag": "ლანჩ ბოქსი",
    "common.greenBags": "ლანჩ ბოქსები",
    "common.rating": "შეფასება",
    "common.reviews": "შეფასებები",
    "common.noRatings": "შეფასებები ჯერ არ არის",
    "common.noReviews": "შეფასებები ჯერ არ არის",
    "common.noWrittenReview": "ტექსტური შეფასება არ არის.",
    "common.business": "ბიზნესი",
    "common.businessUnavailable": "ბიზნესი მიუწვდომელია",
    "common.addressUnavailable": "მისამართი მიუწვდომელია",
    "common.offerUnavailable": "შეთავაზება მიუწვდომელია",
    "common.today": "დღეს",
    "common.tomorrow": "ხვალ",
    "common.upcoming": "მომავალი",
    "common.food": "საკვები",

    "home.badge": "თბილისის საკვების გადარჩენის პლატფორმა",
    "home.title1": "დაზოგე თანხა კარგ საკვებზე.",
    "home.title2": "გადაარჩინე საკვები.",
    "home.title3": "მხარი დაუჭირე ადგილობრივ ბიზნესებს.",
    "home.subtitle":
      "ლანჩ ბოქსები ფასდაკლებით, თბილისში.",
    "home.explore": "აღმოჩენა",
    "home.joinBusiness": "ბიზნესებისთვის",
    "home.pickupOnly": "მხოლოდ წაღება",
    "home.onlinePayment": "პილოტური ჯავშნები",
    "home.trustVerified": "დადასტურებული ბიზნესები",
    "home.trustEasyPickup": "მარტივი წაღება",
    "home.trustLocalBusinesses": "ადგილობრივი ბიზნესები",
    "home.trustFoodRescue": "საკვების გადარჩენა",
    "home.trustEasyPickupProcess": "მარტივი წაღების პროცესი",
    "home.trustReduceFoodWaste": "საკვების ნარჩენის შემცირება",
    "home.trustPickupOnlyMarketplace": "მხოლოდ ადგილზე წაღების პლატფორმა",
    "home.trustPickupCodeVerification": "წაღების კოდის შემოწმება",
    "home.trustCustomerRatings": "მომხმარებლის შეფასებები",
    "home.trustSecureReservationFlow": "უსაფრთხო ჯავშნის პროცესი",
    "home.trustLocalTbilisiBusinesses": "ადგილობრივი თბილისის ბიზნესები",
    "home.featuredOffer": "რჩეული შეთავაზება",
    "home.topBusinesses": "ყველაზე მაღალი შეფასების ბიზნესები",
    "home.stats": "საპილოტე ნდობა",
    "home.howItWorks": "როგორ მუშაობს არ გადააგდო",
    "home.howItWorksIntro":
      "მარტივი წაღების პროცესი ფასდაკლებული ლანჩ ბოქსებისთვის ადგილობრივი ბიზნესებიდან.",
    "home.step1": "ნაბიჯი 1",
    "home.step1Text": "დაათვალიერე საკვების ლანჩ ბოქსები ადგილობრივი ბიზნესებიდან.",
    "home.step2": "ნაბიჯი 2",
    "home.step2Text": "დაჯავშნე ლანჩ ბოქსი, სანამ გაიყიდება.",
    "home.step3": "ნაბიჯი 3",
    "home.step3Text": "წაიღე შეკვეთა მითითებულ წაღების დროს.",
    "home.step4": "ნაბიჯი 4",
    "home.step4Text": "ისიამოვნე კარგი საკვებით და დაეხმარე ნარჩენის შემცირებას.",
    "home.trustTitle": "შემოწმებული ადგილობრივი ბიზნესები",
    "home.trustMessage":
      "ყველა ბიზნესი მოწმდება, სანამ არ გადააგდოზე დამტკიცდება.",
    "home.trustCardVerifiedTitle": "დადასტურებული ბიზნესები",
    "home.trustCardVerifiedText": "ყველა ბიზნესი დამტკიცებამდე მოწმდება.",
    "home.trustCardPickupTitle": "მხოლოდ ადგილზე წაღება",
    "home.trustCardPickupText": "დაჯავშნე ონლაინ და წაიღე ადგილზე.",
    "home.trustCardLocalTitle": "ადგილობრივი პლატფორმა",
    "home.trustCardLocalText": "ფოკუსი თბილისის საპილოტე ბიზნესებზე.",
    "home.trustCardWasteTitle": "საკვების ნარჩენის შემცირება",
    "home.trustCardWasteText": "დაეხმარე კარგი საკვების გადარჩენას.",
    "home.whyBadge": "რატომ არის მნიშვნელოვანი",
    "home.whyUse": "რატომ გამოიყენო არ გადააგდო?",
    "home.whySaveMoney": "დაზოგე თანხა საკვებზე",
    "home.whyReduceWaste": "შეამცირე საკვების ნარჩენი",
    "home.whySupportLocal": "მხარი დაუჭირე ადგილობრივ ბიზნესებს",
    "home.whyDiscoverTbilisi": "აღმოაჩინე ახალი ადგილები თბილისში",
    "home.noFeatured": "რჩეული შეთავაზებები ჯერ არ არის.",
    "home.pickupWindows": "წაღების დროები",
    "home.noSurpriseBags": "ახლა ლანჩ ბოქსები ხელმისაწვდომი არ არის.",
    "home.publishLater": "ბიზნესები შეთავაზებებს ხშირად დღის მეორე ნახევარში აქვეყნებენ.",
    "home.missionBadge": "საპილოტე გაშვება",
    "home.missionTitle": "რატომ არ გადააგდო?",
    "home.missionIntro": "ყოველდღე კარგი საკვები გაუყიდავი რჩება.",
    "home.missionText":
      "ნაკლები ნარჩენი, დაბალი ფასი.",
    "home.missionCustomer": "მომხმარებლები ზოგავენ თანხას.",
    "home.missionBusiness": "ბიზნესები იღებენ შემოსავალს გაუყიდავი საკვებიდან.",
    "home.missionWaste": "ნაკლები საკვები ხვდება ნაგავში.",
    "home.businessCtaBadge": "ბიზნესებისთვის",
    "home.businessCtaTitle": "გაქვს საცხობი, კაფე ან რესტორანი?",
    "home.businessCtaText":
      "შემოუერთდი არ გადააგდოს და გადააქციე დარჩენილი საკვები დამატებით შემოსავალად.",
    "home.moreBusinessesJoiningSoon": "მეტი ბიზნესი მალე შემოგვიერთდება",
    "home.moreBusinessesJoiningSoonText":
      "არ გადააგდო ფრთხილად ეშვება დადასტურებულ ადგილობრივ ბიზნესებთან თბილისში.",
    "home.registerBusiness": "დაარეგისტრირე ბიზნესი",
    "home.customerCtaBadge": "მომხმარებლებისთვის",
    "home.customerCtaTitle": "კარგი საკვები, კარგ ფასად",
    "home.customerCtaText":
      "დაზოგე და შეამცირე ნარჩენი.",
    "home.finalCtaTitle": "მზად ხარ საკვების გადასარჩენად?",
    "home.finalCtaText": "დაათვალიერე დღევანდელი ლანჩ ბოქსები.",

    "customerOnboarding.title": "პირველად იყენებ არ გადააგდოს?",
    "customerOnboarding.stepBrowse": "დაათვალიერე ლანჩ ბოქსები.",
    "customerOnboarding.stepReserve": "დაჯავშნე, სანამ გაიყიდება.",
    "customerOnboarding.stepCollect": "წაიღე მითითებულ დროს.",
    "customerOnboarding.stepEnjoy": "ისიამოვნე კარგი საკვებით უკეთეს ფასად.",

    "offers.title": "ლანჩ ბოქსები შენთან ახლოს.",
    "offers.search": "მოძებნე საკვები, ბიზნესი, მისამართი...",
    "offers.reset": "გასუფთავება",
    "offers.allCategories": "ყველა კატეგორია",
    "offers.sortNewest": "უახლესი პირველი",
    "offers.sortLowest": "დაბალი ფასი",
    "offers.sortHighest": "მაღალი ფასი",
    "offers.availableOnly": "მხოლოდ ხელმისაწვდომი",
    "offers.filterHint":
      "გამოიყენე ძიება, კატეგორიები და დალაგება სასურველი წაღების ფანჯრის საპოვნელად.",
    "offers.tbilisiPilot": "თბილისის პილოტი",
    "offers.heading": "საკვების გადარჩენის შეთავაზებები",
    "offers.matches": "ემთხვევა ფილტრებს.",
    "offers.noMatching": "შესაბამისი შეთავაზება არ არის",
    "offers.clearFilters": "ფილტრების გასუფთავება",
    "offers.addFavorite": "რჩეულებში დამატება",
    "offers.removeFavorite": "რჩეულებიდან წაშლა",

    "offerDetail.back": "შეთავაზებებზე დაბრუნება",
    "offerDetail.allergens": "ალერგენები",
    "offerDetail.allergensAsk": "ალერგენების შესახებ ჰკითხე ბიზნესს წაღებისას.",
    "offerDetail.reviewsTitle": "მომხმარებლის შეფასებები",
    "offerDetail.savings": "ზოგავ",
    "offerDetail.noSavingsListed": "მითითებული არ არის",
    "offerDetail.pickupDate": "წაღების თარიღი",
    "offerDetail.pickupTime": "წაღების დრო",
    "offerDetail.afterReservationOrder": "ჯავშანი შეკვეთებში გამოჩნდება.",
    "offerDetail.afterReservationCode": "მიიღებ წაღების კოდს.",
    "offerDetail.afterReservationVisit": "ეწვიე ბიზნესს წაღების დროს.",
    "offerDetail.afterReservationShowCode":
      "შეკვეთის მისაღებად აჩვენე წაღების კოდი.",
    "offerDetail.cancellationReminderTitle": "გაუქმების შეხსენება",
    "offerDetail.ratingReminderText":
      "შეფასება წაღების შემდეგ შეგეძლება.",
    "offerDetail.notFound": "ეს ბოქსი აღარ არის ხელმისაწვდომი.",

    "businessProfile.back": "შეთავაზებებზე დაბრუნება",
    "businessProfile.title": "ბიზნეს პროფილი",
    "businessProfile.verified": "დადასტურებული ბიზნესი",
    "businessProfile.businessType": "ბიზნესის ტიპი",
    "businessProfile.address": "მისამართი",
    "businessProfile.activeOffers": "აქტიური შეთავაზებები",
    "businessProfile.activeOffersHint": "ახლა ხელმისაწვდომია",
    "businessProfile.customerReviews": "მომხმარებლის შეფასებები",
    "businessProfile.outOfFive": "5-დან",
    "businessProfile.trustTitle": "დამტკიცებულია არ გადააგდოზე",
    "businessProfile.trustMessage":
      "ეს ბიზნესი დამტკიცებულია არ გადააგდოზე შეთავაზებების გასაყიდად.",
    "businessProfile.localBusinessTitle": "ადგილობრივი კვების ბიზნესი",
    "businessProfile.localBusinessText":
      "ეს პროფილი მომხმარებლებს ეხმარება გაიგონ, ვინ ამზადებს ლანჩ ბოქსებს.",
    "businessProfile.pickupOnlyTitle": "მხოლოდ ადგილზე წაღება",
    "businessProfile.pickupOnlyText":
      "დაჯავშნე ონლაინ, წაიღე ადგილზე.",
    "businessProfile.reviewsIntro":
      "შეფასებები დასრულებული წაღებების შემდეგ.",
    "businessProfile.noActiveOffers": "ახლა აქტიური ლანჩ ბოქსები არ არის.",
    "businessProfile.noActiveOffersHint":
      "ამ ბიზნესის ახალი საკვების გადარჩენის შეთავაზებებისთვის მოგვიანებით შეამოწმე.",
    "businessProfile.noReviewsHint":
      "შეფასებები აქ გამოჩნდება მას შემდეგ, რაც მომხმარებლები წაღებას დაასრულებენ და ბიზნესს შეაფასებენ.",
    "businessProfile.notFound": "ეს ბიზნესი ვერ მოიძებნა.",

    "reviewReport.link": "დაარეპორტე",
    "reviewReport.title": "რა პრობლემაა ამ შეფასებასთან?",
    "reviewReport.reasonOffensive": "შეურაცხმყოფელია",
    "reviewReport.reasonSpam": "სპამია",
    "reviewReport.reasonFalse": "სიმართლეს არ შეესაბამება",
    "reviewReport.reasonOther": "სხვა მიზეზი",
    "reviewReport.commentLabel": "კომენტარი (არასავალდებულო)",
    "reviewReport.commentPlaceholder": "მოგვწერე მეტი დეტალი",
    "reviewReport.send": "გაგზავნა",
    "reviewReport.sending": "იგზავნება...",
    "reviewReport.chooseReason": "გთხოვ, აირჩიე მიზეზი.",
    "reviewReport.thanks": "მადლობა. რეპორტი მივიღეთ და გადავხედავთ.",
    "reviewReport.alreadyReported": "ეს შეფასება უკვე დაარეპორტე.",
    "reviewReport.failed": "რეპორტი ვერ გაიგზავნა. გთხოვ, სცადე ხელახლა.",

    "orders.reserved": "დაჯავშნილი",
    "orders.collected": "წაღებული",
    "orders.cancelled": "გაუქმებული",
    "orders.pickupCode": "წაღების კოდი",
    "orders.cancelPolicy": "გაუქმება შეგიძლია წაღებამდე 2 საათით ადრე სრული დაბრუნებით.",
    "orders.pickupUnavailable": "წაღების ინფორმაცია მიუწვდომელია",
    "orders.statusGuideReservedTitle": "დაჯავშნილი",
    "orders.statusGuideReservedText":
      "შენი წაღების კოდი აქტიურია. ეწვიე ბიზნესს მითითებულ წაღების დროს.",
    "orders.statusGuideCollectedTitle": "წაღებული",
    "orders.statusGuideCollectedText":
      "ბიზნესმა კოდი შეამოწმა და წაღება დაასრულა.",
    "orders.statusGuideCancelledTitle": "გაუქმებული",
    "orders.statusGuideCancelledText":
      "გაუქმებული ან დაბრუნებული ჯავშნები ისტორიაში რჩება.",
    "orders.reviewThanks": "მადლობა შეფასებისთვის.",
    "orders.ratePickup": "შეაფასე წაღება",
    "orders.reviewPlaceholder": "შეფასების ტექსტი ბიზნესისთვის (არასავალდებულო)",
    "orders.reviewLabel": "დაწერე შენი შეფასება",
    "orders.submitReview": "შეფასების გაგზავნა",

    "favorites.badge": "შენახული შეთავაზებები",
    "favorites.title": "შენი რჩეული ლანჩ ბოქსები.",
    "favorites.subtitle": "შენი საყვარელი შეთავაზებები ერთად.",
    "favorites.saved": "შენახული",
    "favorites.loading": "რჩეულები იტვირთება...",
    "favorites.emptyTitle": "შენახული შეთავაზებები ჯერ არ არის",
    "favorites.emptyHint": "შეინახე საინტერესო ლანჩ ბოქსები და მოგვიანებით აქ ნახავ.",
    "favorites.educationTitle": "შეინახე შეთავაზებები მოგვიანებისთვის",
    "favorites.educationText":
      "რჩეულებში შეგიძლია შეინახო ლანჩ ბოქსები, რომლებსაც მოგვიანებით დაჯავშნას განიხილავ.",
    "favorites.trustReminder":
      "შეთავაზებები შეიძლება სწრაფად გაიყიდოს. თუ რამე მოგეწონა, ადრე დაჯავშნე.",
    "favorites.viewOffer": "შეთავაზების ნახვა",
    "favorites.offerUnavailable": "შეთავაზება აღარ არის ხელმისაწვდომი",
    "favorites.offerEndedHint":
      "ეს შენახული შეთავაზება შეიძლება დასრულდა, გაიყიდა ან აღარ არის ხელმისაწვდომი.",

    "businessDashboard.title": "მართე შეთავაზებები და წაღებები.",
    "businessDashboard.subtitle": "გამოაქვეყნე ლანჩ ბოქსები და გაეცი შეკვეთები.",
    "businessDashboard.welcome": "კეთილი დაბრუნება",
    "businessDashboard.welcomeText":
      "მართე შეთავაზებები, ჯავშნები და მომხმარებლის გამოხმაურება ერთ ადგილას.",
    "businessDashboard.businessOwner": "ბიზნესის მფლობელო",
    "businessDashboard.stats": "ბიზნეს სტატისტიკა",
    "businessDashboard.statsIntro":
      "ჯავშნები, წაღებები, შეფასებები.",
    "businessDashboard.emptyAnalytics":
      "სტატისტიკა გამოჩნდება, როცა მომხმარებლები შენს შეთავაზებებთან ურთიერთობას დაიწყებენ.",
    "businessDashboard.createOffer": "შეთავაზების შექმნა",
    "businessDashboard.createOfferButton": "შეთავაზების შექმნა",
    "businessDashboard.publishing": "ქვეყნდება...",
    "businessDashboard.selectedImage": "არჩეული სურათი",
    "businessDashboard.created": "შექმნილია",
    "businessDashboard.customer": "მომხმარებელი",
    "businessDashboard.reliability": "სანდოობა",
    "businessDashboard.myOffers": "ჩემი შეთავაზებები",
    "businessDashboard.reservations": "ჯავშნები",
    "businessDashboard.businessReviews": "ბიზნესის შეფასებები",
    "businessDashboard.activeOffersMetric": "აქტიური შეთავაზებები",
    "businessDashboard.activeOffersHelper":
      "შეთავაზებები, რომლებსაც მომხმარებლები ახლა ხედავენ",
    "businessDashboard.totalOffersMetric": "სულ შეთავაზებები",
    "businessDashboard.totalOffersHelper": "ამ ბიზნესის მიერ შექმნილი ყველა შეთავაზება",
    "businessDashboard.totalReservationsMetric": "სულ ჯავშნები",
    "businessDashboard.totalReservationsHelper": "მომხმარებლებისგან მიღებული ჯავშნები",
    "businessDashboard.completedPickupsMetric": "დასრულებული წაღებები",
    "businessDashboard.completedPickupsHelper": "წარმატებით წაღებული შეკვეთები",
    "businessDashboard.cancelledReservationsMetric": "გაუქმებული ჯავშნები",
    "businessDashboard.cancelledReservationsHelper":
      "მომხმარებლების მიერ გაუქმებული ჯავშნები",
    "businessDashboard.averageRating": "საშუალო შეფასება",
    "businessDashboard.averageRatingHelper": "მომხმარებლის კმაყოფილების ქულა",
    "businessDashboard.totalReviews": "შეფასებების რაოდენობა",
    "businessDashboard.reservationSummary": "ჯავშნების შეჯამება",
    "businessDashboard.reservationSummaryHint":
      "აქ სწრაფად ნახავ, რომელ ჯავშნებს სჭირდება ყურადღება.",
    "businessDashboard.noShow": "არ გამოცხადდა",
    "businessDashboard.noReviews": "შეფასებები ჯერ არ არის.",
    "businessDashboard.noOffers": "შექმენი პირველი ლანჩ ბოქსი.",
    "businessDashboard.noReservations": "ჯავშნები ჯერ არ არის.",
    "businessDashboard.noOffersHint":
      "შენი შეთავაზებები შექმნის შემდეგ აქ გამოჩნდება.",
    "businessDashboard.noReservationsHint":
      "მომხმარებლები, რომლებიც შენს შეთავაზებებს დაჯავშნიან, აქ გამოჩნდებიან.",
    "businessDashboard.noReviewsHint":
      "შეფასებები დასრულებული წაღებების შემდეგ გამოჩნდება.",
    "businessDashboard.noFilteredReservations": "ამ ფილტრში ჯავშნები არ არის.",
    "businessDashboard.noFilteredReservationsHint":
      "სხვა სტატუსი აირჩიე მეტი შედეგის სანახავად.",
    "businessDashboard.createFirstOffer": "პირველი შეთავაზების შექმნა",
    "businessDashboard.viewReservations": "ჯავშნების ნახვა",
    "businessOnboarding.badge": "საპილოტე ონბორდინგი",
    "businessOnboarding.welcomeTitle": "კეთილი იყოს შენი მობრძანება არ გადააგდოში.",
    "businessOnboarding.welcomeText":
      "შექმენი პირველი ლანჩ ბოქსი.",
    "businessOnboarding.createFirstBag": "პირველი ლანჩ ბოქსის შექმნა",
    "businessOnboarding.workflowBadge": "ბიზნეს გზამკვლევი",
    "businessOnboarding.workflowTitle": "როგორ მუშაობს არ გადააგდო",
    "businessOnboarding.workflowCreateOffer": "შექმენი შეთავაზება.",
    "businessOnboarding.workflowReceiveReservations": "მიიღე ჯავშნები.",
    "businessOnboarding.workflowVerifyPickupCode": "შეამოწმე წაღების კოდი.",
    "businessOnboarding.workflowCompletePickup": "დაასრულე წაღება.",
    "businessOnboarding.workflowReceiveRatings": "მიიღე შეფასებები.",
    "businessOnboarding.checklistBadge": "სწრაფი დაწყება",
    "businessOnboarding.checklistTitle": "დაწყების ნაბიჯები",
    "businessOnboarding.step": "ნაბიჯი",
    "businessOnboarding.checkCreateOffer": "შექმენი შეთავაზება",
    "businessOnboarding.checkFirstReservation": "დაელოდე ჯავშნებს",
    "businessOnboarding.checkFirstPickup": "შეამოწმე წაღების კოდი",
    "businessOnboarding.checkFirstRating": "მიიღე შეფასებები",
    "businessOnboarding.tipsBadge": "რჩევები წარმატებისთვის",
    "businessOnboarding.tipsTitle": "მარტივი გზები უკეთესი გაყიდვებისთვის",
    "businessOnboarding.tipPublishEarly": "გამოაქვეყნე შეთავაზებები დახურვამდე რამდენიმე საათით ადრე.",
    "businessOnboarding.tipClearNames": "გამოიყენე მკაფიო შეთავაზების სახელები.",
    "businessOnboarding.tipAccurateTimes": "წაღების დროები ზუსტად მიუთითე.",
    "businessOnboarding.tipPromptPickup": "მომხმარებლებს წაღებისას სწრაფად მოემსახურე.",
    "businessOnboarding.firstOfferGuidanceTitle": "პირველი შეთავაზების გზამკვლევი",
    "businessOnboarding.recommendedQuantity": "რეკომენდებული რაოდენობა",
    "businessOnboarding.recommendedQuantityValue": "3-10 ლანჩ ბოქსი",
    "businessOnboarding.recommendedPickupWindow": "წაღების დრო",
    "businessOnboarding.recommendedPickupWindowValue": "1-2 საათი",
    "businessOnboarding.recommendedTitle": "მკაფიო სათაურის მაგალითი",
    "businessOnboarding.recommendedTitleValue": "საცხობის ლანჩ ბოქსი",
    "businessOnboarding.realExamplesTitle": "რეალისტური შეთავაზებების მაგალითები",
    "businessOnboarding.realExamplesText":
      "მაგალითად: საცხობის ლანჩ ბოქსი.",
    "businessOnboarding.titleHelper":
      "სათაური: გამოიყენე მკაფიო სახელი, მაგალითად საცხობის ლანჩ ბოქსი.",
    "businessOnboarding.quantityHelper":
      "რაოდენობა: რამდენ მომხმარებელს შეუძლია ამ შეთავაზების დაჯავშნა.",
    "businessOnboarding.pickupWindowHelper":
      "წაღების დრო: როდის შეუძლიათ მომხმარებლებს შეკვეთის წაღება. საუკეთესოა მკაფიო 1-2 საათიანი ვადა.",
    "businessOnboarding.offerValidationHint":
      "გამოქვეყნებამდე გადაამოწმე დეტალები.",
    "businessOnboarding.reservationGuidanceTitle": "როგორ მუშაობს ჯავშნები",
    "businessOnboarding.reservationGuidanceText":
      "საკვების გადაცემამდე გადაამოწმე კოდი.",
    "businessOnboarding.reservationCardHint":
      "ბარათზე ჩანს კლიენტი, სტატუსი და დრო.",
    "businessOnboarding.pickupVerificationTitle": "წაღების შემოწმება",
    "businessOnboarding.pickupVerificationText":
      "ჰკითხე კოდი და დაადასტურე ბარათიდან.",
    "businessOnboarding.pickupStepAskCode": "ჰკითხე მომხმარებელს კოდი",
    "businessOnboarding.pickupStepEnterCode": "შეიყვანე კოდი შემოწმების ფანჯარაში",
    "businessOnboarding.pickupStepComplete": "დაასრულე წაღება მხოლოდ დამთხვევის შემდეგ",
    "businessOnboarding.ratingsGuidanceTitle": "რატომ არის შეფასებები მნიშვნელოვანი",
    "businessOnboarding.ratingsGuidanceText":
      "კარგი შეფასებები მომხმარებლებს შენს ბიზნესში ნდობას უჩენს და მომავალ ჯავშნებს ეხმარება.",

    "admin.title": "ადმინ პანელი",
    "admin.subtitle": "გადაამოწმე ბიზნესები და აკონტროლე საკვების გადარჩენის პლატფორმა.",
    "admin.pendingBusinesses": "მოლოდინში მყოფი ბიზნესები",
    "admin.analytics": "ანალიტიკის მიმოხილვა",

    "login.title": "კეთილი დაბრუნება",
    "login.email": "ელფოსტა",
    "login.password": "პაროლი",
    "login.signIn": "შესვლა",
    "login.signUp": "ანგარიშის შექმნა",
    "login.formHint": "ერთი ფორმით შეგიძლია ანგარიშის შექმნა ან შესვლა.",
    "login.signInTitle": "შედი არ გადააგდოში",
    "login.signInHint": "გასაგრძელებლად შეიყვანე ელფოსტა და პაროლი.",
    "login.signUpTitle": "შექმენი ანგარიში",
    "login.signUpHint": "შეიყვანე ელფოსტა და პაროლი.",
    "login.signInModeHelper": "არსებული ანგარიში",
    "login.signUpModeHelper": "ახალი ანგარიში",
    "login.alreadyHaveAccount": "უკვე გაქვს ანგარიში?",
    "login.dontHaveAccount": "არ გაქვს ანგარიში?",
    "login.redirectCheckout":
      "ამ შეთავაზების დასაჯავშნად, გთხოვ, შეხვიდე ანგარიშში.",
    "login.redirectOrders": "შეკვეთების სანახავად, გთხოვ, შეხვიდე ანგარიშში.",
    "login.redirectFavorites":
      "შენახული შეთავაზებების სანახავად, გთხოვ, შეხვიდე ანგარიშში.",
    "login.accountTypeHint":
      "აირჩიე მომხმარებელი, თუ საკვების შეთავაზებების დაჯავშნა გინდა. აირჩიე ბიზნესი, თუ კაფეს, საცხობის, რესტორნის ან მაღაზიის შეთავაზებებს გამოაქვეყნებ.",
    "login.customer": "მომხმარებელი",
    "login.business": "ბიზნესი",
    "login.customerHint": "დაჯავშნე საკვების შეთავაზებები.",
    "login.businessHint": "შექმენი და მართე შეთავაზებები.",
    "login.forCustomers": "მომხმარებლებისთვის",
    "login.forCustomersText": "დაჯავშნე ფასდაკლებული ლანჩ ბოქსები და წაიღე ადგილზე.",
    "login.businessTitle": "ბიზნესის შესვლა",
    "login.businessLink": "ბიზნესი ხარ? შედი აქ",
    "login.forBusinessesText": "შექმენი ადგილზე წასაღები შეთავაზებები და მართე მომხმარებლის ჯავშნები.",

    "businessRegister.badge": "ადგილობრივი ბიზნესებისთვის",
    "businessRegister.title": "დაარეგისტრირე შენი კვების ბიზნესი",
    "businessRegister.subtitle":
      "4 ნაბიჯი. შემდეგ ჩვენ ვამოწმებთ.",
    "businessRegister.step1": "1. გაგზავნე ბიზნესი",
    "businessRegister.step1Text": "დაამატე სახელი, ტიპი, მისამართი და ტელეფონი.",
    "businessRegister.step2": "2. დაელოდე დამტკიცებას",
    "businessRegister.step2Text": "ადმინი ამოწმებს და ამტკიცებს ბიზნესს.",
    "businessRegister.step3": "3. გამოაქვეყნე შეთავაზებები",
    "businessRegister.step3Text": "შექმენი ადგილზე წასაღები საკვების შეთავაზებები.",
    "businessRegister.details": "ბიზნესის დეტალები",
    "businessRegister.detailsHint":
      "გამოიყენე რეალური ინფორმაცია, რომელსაც მომხმარებლები და ადმინი თბილისის პილოტის დროს ამოიცნობენ.",
    "businessRegister.requiredInfoTitle": "რა დაგჭირდება",
    "businessRegister.requiredNameType": "ბიზნესის სახელი და ტიპი",
    "businessRegister.requiredAddress": "წაღების მისამართი თბილისში",
    "businessRegister.requiredPhone": "ტელეფონის ნომერი ადმინთან კომუნიკაციისთვის",
    "businessRegister.expectationsTitle": "რა ხდება შემდეგ",
    "businessRegister.expectationsText":
      "განაცხადს ხელით ვამოწმებთ.",
    "businessRegister.name": "ბიზნესის სახელი",
    "businessRegister.address": "მისამართი თბილისში",
    "businessRegister.phone": "ტელეფონის ნომერი",
    "businessRegister.submitting": "იგზავნება...",
    "businessRegister.checking": "ანგარიში მოწმდება...",
    "businessRegister.submit": "დასამტკიცებლად გაგზავნა",

    "forBusinesses.metaBadge": "ბიზნესებისთვის",
    "forBusinesses.heroTitle": "შენს გაუყიდავ საკვებს ჯერ კიდევ აქვს ღირებულება.",
    "forBusinesses.heroSubtitle":
      "გაყიდე დარჩენილი საკვები ლანჩ ბოქსებად.",
    "forBusinesses.heroCtaRegister": "დაარეგისტრირე ბიზნესი",
    "forBusinesses.heroCtaContact": "ჯერ დაგვიკავშირდი",
    "forBusinesses.problemBadge": "პრობლემა",
    "forBusinesses.problemTitle": "კარგი საკვები იყრება",
    "forBusinesses.problemText":
      "დღის ბოლოს დარჩენილი საკვები ხშირად იყრება.",
    "forBusinesses.solutionBadge": "გამოსავალი",
    "forBusinesses.solutionTitle": "დაარეგისტრირე, გაყიდე.",
    "forBusinesses.solutionListTitle": "დარეგისტრირდი წუთში",
    "forBusinesses.solutionListText":
      "ფასი, რაოდენობა, წაღების დრო. სულ ესაა.",
    "forBusinesses.solutionReachTitle": "მიაღწიე ახალ მომხმარებლებს",
    "forBusinesses.solutionReachText":
      "გაგიცნობენ ახლომახლო მომხმარებლები.",
    "forBusinesses.solutionRecoverTitle": "დაიბრუნე რეალური შემოსავალი",
    "forBusinesses.solutionRecoverText":
      "დანაკარგის ნაცვლად, წინასწარ გადახდილი შეკვეთები.",
    "forBusinesses.howBadge": "როგორ მუშაობს",
    "forBusinesses.howTitle": "ჭარბი საკვებიდან გაყიდვამდე",
    "forBusinesses.howStep1Title": "დაარეგისტრირე ბიზნესი",
    "forBusinesses.howStep1Text":
      "შენი კომპანია და წაღების ადგილი.",
    "forBusinesses.howStep2Title": "გამოაქვეყნე ლანჩ ბოქსი",
    "forBusinesses.howStep2Text":
      "ფასი, რაოდენობა, წაღების დრო.",
    "forBusinesses.howStep3Title": "მიიღე ჯავშანი და გადახდა",
    "forBusinesses.howStep3Text":
      "მომხმარებლები ონლაინ იხდიან ჯავშნისთანავე. ეს პანელში დაუყოვნებლივ გამოჩნდება.",
    "forBusinesses.howStep4Title": "გადაეცი შეკვეთა",
    "forBusinesses.howStep4Text":
      "კლიენტი აჩვენებს კოდს, შენ ადასტურებ.",
    "forBusinesses.commissionBadge": "ფასები, მარტივად",
    "forBusinesses.commissionTitle": "ყოველთვიური გადასახადის გარეშე.",
    "forBusinesses.commissionText": "საკომისიოს იხდი მხოლოდ გაყიდულ ლანჩ ბოქსზე.",
    "forBusinesses.commissionNoSale": "არ გაიყიდა — არ იხდი",
    "forBusinesses.commissionNoSaleText":
      "საკომისიოს იხდი მხოლოდ მაშინ, როცა ლანჩ ბოქსი რეალურად დაჯავშნილი და გადახდილია.",
    "forBusinesses.ctaTitle": "მზად ხარ, შეწყვიტო საკვების გადაყრა?",
    "forBusinesses.ctaText":
      "გადააქციე ჭარბი საკვები გაყიდვებად, ნარჩენის ნაცვლად.",
    "forBusinesses.ctaRegister": "დაარეგისტრირე ბიზნესი",
    "forBusinesses.ctaQuestions": "გაქვს კითხვები?",
    "forBusinesses.ctaContact": "დაგვიკავშირდი",

    "checkout.rescueBox": "ლანჩ ბოქსი",
    "checkout.noShowWarning": "გაფრთხილება გამოუცხადებლობაზე",
    "checkout.noShowText": "თუ შეკვეთას არ წაიღებ, ეს შეიძლება გამოუცხადებლობად ჩაითვალოს.",
    "checkout.reserving": "უსაფრთხო გადახდა მზადდება...",
    "checkout.successMessage":
      "ჯავშანი დადასტურდა. წაღების კოდი შეკვეთებშია.",
    "checkout.afterConfirmation": "დადასტურების შემდეგ",
    "checkout.ordersReminder":
      "დადასტურების შემდეგ შენი ჯავშანი შეკვეთებში გამოჩნდება.",
    "checkout.ratingReminder":
      "წაღების შემდეგ შეგიძლია შეაფასო გამოცდილება და სხვა მომხმარებლებს დაეხმარო.",
    "checkout.trustSecureReservation": "უსაფრთხო ჯავშანი",
    "checkout.pickupGuideBadge": "წაღების გზამკვლევი",
    "checkout.pickupGuideTitle": "როგორ მუშაობს წაღება",
    "checkout.pickupGuideIntro":
      "წაღების კოდი შენი ჯავშნის დადასტურებაა. მისვლისას მზად გქონდეს.",
    "checkout.pickupStep1": "ნაბიჯი 1",
    "checkout.pickupStep1Text": "დაჯავშნე შენი ლანჩ ბოქსი.",
    "checkout.pickupStep2": "ნაბიჯი 2",
    "checkout.pickupStep2Text": "მიიღე წაღების კოდი.",
    "checkout.pickupStep3": "ნაბიჯი 3",
    "checkout.pickupStep3Text": "ეწვიე ბიზნესს მითითებულ წაღების დროს.",
    "checkout.pickupStep4": "ნაბიჯი 4",
    "checkout.pickupStep4Text": "აჩვენე წაღების კოდი და მიიღე შეკვეთა.",

    "faq.badge": "ნდობის ცენტრი",
    "faq.title": "კითხვები არ გადააგდოს შესახებ",
    "faq.subtitle":
      "მოკლე პასუხები.",
    "faq.trustLabel": "შემოწმებული ბიზნესები",
    "faq.trustText":
      "ბიზნესებს დამტკიცებამდე ვამოწმებთ.",
    "faq.pickupText":
      "ყოველ ჯავშანს აქვს წაღების კოდი.",
    "faq.ratingText":
      "მომხმარებლებს შეუძლიათ დასრულებული წაღებების შეფასება, რაც სხვებს არჩევაში ეხმარება.",
    "faq.customers": "მომხმარებლებისთვის",
    "faq.businesses": "ბიზნესებისთვის",
    "faq.general": "ზოგადი",
    "faq.customer.what.question": "რა არის არ გადააგდო?",
    "faq.customer.what.answer":
      "არ გადააგდო არის ქართული საკვების გადარჩენის პლატფორმა, სადაც ადგილობრივ ბიზნესებს შეუძლიათ დარჩენილი საკვების ლანჩ ბოქსებად ფასდაკლებით გაყიდვა ნარჩენად გადაყრის ნაცვლად.",
    "faq.customer.reservations.question": "როგორ მუშაობს დაჯავშნა?",
    "faq.customer.reservations.answer":
      "დაათვალიერე ხელმისაწვდომი ლანჩ ბოქსები, გახსენი შეთავაზება, გადადი გადახდის გვერდზე და დაადასტურე ჯავშანი. დადასტურების შემდეგ შეკვეთა „შეკვეთების“ გვერდზე გამოჩნდება.",
    "faq.customer.pickups.question": "როგორ მუშაობს წაღება?",
    "faq.customer.pickups.answer":
      "შეკვეთა უნდა წაიღო პირდაპირ ბიზნესიდან მითითებულ წაღების დროს. აჩვენე წაღების კოდი, რომ ბიზნესმა შეკვეთა გადაამოწმოს და დაასრულოს.",
    "faq.customer.cancel.question": "შემიძლია ჯავშნის გაუქმება?",
    "faq.customer.cancel.answer":
      "დიახ. ჯავშნის გაუქმება შეგიძლია წაღებამდე 2 საათით ადრე. ამ ვადის შემდეგ გაუქმება შეიძლება აღარ იყოს ხელმისაწვდომი.",
    "faq.customer.miss.question": "რა მოხდება, თუ წაღებას გამოვტოვებ?",
    "faq.customer.miss.answer":
      "თუ დაჯავშნილ შეკვეთას წაღების დროს არ აიღებ, ეს შეიძლება გამოუცხადებლობად ჩაითვალოს. ეს ბიზნესებს არასანდო ჯავშნებისგან იცავს.",
    "faq.customer.ratings.question": "როგორ მუშაობს შეფასებები?",
    "faq.customer.ratings.answer":
      "დასრულებული წაღების შემდეგ მომხმარებელს შეუძლია ბიზნესის შეფასება და სურვილისამებრ ტექსტური მიმოხილვის დატოვება. შეფასებები სხვებს არჩევანის გაკეთებაში ეხმარება.",
    "faq.business.join.question": "როგორ შევუერთდე არ გადააგდოს?",
    "faq.business.join.answer":
      "გახსენი „ბიზნესებისთვის“ საიტის ქვედა ნაწილში, შექმენი ბიზნეს ანგარიში და გაიარე რეგისტრაციის 4 ნაბიჯი.",
    "faq.business.approval.question": "როგორ მუშაობს დამტკიცება?",
    "faq.business.approval.answer":
      "ადმინი ამოწმებს გაგზავნილ ბიზნესებს, სანამ ისინი შეთავაზებების გამოქვეყნებას შეძლებენ. ეს პლატფორმას უფრო უსაფრთხოს და სანდოს ხდის.",
    "faq.business.offers.question": "როგორ შევქმნა შეთავაზებები?",
    "faq.business.offers.answer":
      "დამტკიცების შემდეგ გახსენი ბიზნეს პანელი და შექმენი ლანჩ ბოქსი სათაურით, ფასით, რაოდენობით, სურათით და წაღების დროით.",
    "faq.business.collect.question": "როგორ იღებენ მომხმარებლები შეკვეთებს?",
    "faq.business.collect.answer":
      "მომხმარებელი ბიზნესში აჩვენებს წაღების კოდს. შენ კოდს პანელში ამოწმებ და შეკვეთას „წაღებულის“ სტატუსით ასრულებ.",
    "faq.general.tbilisi.question": "ხელმისაწვდომია არ გადააგდო თბილისის გარეთ?",
    "faq.general.tbilisi.answer":
      "პირველი სამიზნე ბაზარი თბილისია. სხვა ქართულ ქალაქებში გაფართოება შესაძლებელია მას შემდეგ, რაც ადგილობრივი პილოტი კარგად იმუშავებს.",
    "faq.general.why.question": "რატომ არსებობს არ გადააგდო?",
    "faq.general.why.answer":
      "არ გადააგდო ეხმარება ბიზნესებს გაუყიდავი საკვებიდან ღირებულების დაბრუნებაში, მომხმარებლებს თანხის დაზოგვაში და საქართველოში საკვების ნარჩენის შემცირებაში.",
    "faq.ctaTitle": "მზად ხარ არ გადააგდოს გამოსაცდელად?",
    "faq.ctaText":
      "დაათვალიერე დღევანდელი შეთავაზებები.",

    "contact.badge": "კონტაქტი და მხარდაჭერა",
    "contact.title": "დაგვიკავშირდი",
    "contact.subtitle":
      "კითხვა გაქვს? მოგვწერე.",
    "contact.ordersTitle": "შეკვეთაზე გაქვს კითხვა?",
    "contact.ordersText":
      "მოგვწერე რა მოხდა და შეკვეთის დეტალები.",
    "contact.reservationsTitle": "ჯავშანში გჭირდება დახმარება?",
    "contact.reservationsText":
      "დაგეხმარებით წაღების, გაუქმებისა და ანგარიშზე წვდომის საკითხებში.",
    "contact.businessTitle": "გინდა როგორც ბიზნესი შემოგვიერთდე?",
    "contact.businessText":
      "ბიზნესი ხარ? სიამოვნებით გიპასუხებთ.",
    "contact.supportEmailLabel": "მხარდაჭერის ელფოსტა",
    "contact.emailTitle": "დაუკავშირდი არ გადააგდოს მხარდაჭერას",
    "contact.emailText":
      "ნებისმიერ საკითხზე მოგვწერე ელფოსტაზე.",
    "contact.businessInquiriesLabel": "ბიზნეს კითხვები",
    "contact.businessInquiriesTitle": "შეამცირე ნარჩენი და გაყიდე დარჩენილი საკვები",
    "contact.businessInquiriesText":
      "გაინტერესებს საკვების ნარჩენის შემცირება და დარჩენილი საკვების გაყიდვა? მოგვწერე მეტი ინფორმაციისთვის.",
    "contact.responseTimeLabel": "პასუხის დრო",
    "contact.responseTimeTitle": "1-2 სამუშაო დღე",
    "contact.responseTimeText":
      "ვცდილობთ 1-2 სამუშაო დღეში გიპასუხოთ.",
    "contact.serviceAreaLabel": "მომსახურების არეალი",
    "contact.serviceAreaTitle": "თბილისი, საქართველო",
    "contact.serviceAreaText": "არ გადააგდო ამჟამად ხელმისაწვდომია თბილისში, საქართველოში.",
    "contact.footerTitle": "გინდა გაგრძელება?",
    "contact.footerText":
      "ხშირი კითხვებისთვის გახსენი FAQ ან დაათვალიერე თბილისის ცოცხალი საკვების გადარჩენის შეთავაზებები.",
    "contact.cta": "მხარდაჭერასთან დაკავშირება",

    "about.badge": "არ გადააგდოს შესახებ",
    "about.title": "საკვების ნარჩენის შემცირება საქართველოში.",
    "about.subtitle":
      "ქართული პლატფორმა საკვების გადასარჩენად.",
    "about.whatLabel": "რა არის არ გადააგდო?",
    "about.whatTitle": "საკვების გადარჩენის პლატფორმა",
    "about.whatText":
      "გაკავშირებთ ბიზნესებთან, რომლებსაც საკვები დარჩათ.",
    "about.launchAreaLabel": "ამჟამინდელი გაშვების არეალი",
    "about.launchAreaTitle": "თბილისი, საქართველო",
    "about.launchAreaText":
      "ვიწყებთ თბილისით, მხოლოდ ადგილზე წაღებით.",
    "about.missionLabel": "მისია",
    "about.missionTitle": "მარტივი მიზნები, რეალური გავლენა",
    "about.missionSaveFood": "გადაარჩინე საკვები.",
    "about.missionSaveMoney": "დაზოგე ფული.",
    "about.missionSupportLocal": "მხარი დაუჭირე ადგილობრივ ბიზნესებს.",
    "about.ctaTitle": "შემოუერთდი საკვების გადარჩენის მოძრაობას",
    "about.ctaText":
      "დაათვალიერე შეთავაზებები ან დაგვიკავშირდი.",

    "privacy.badge": "კონფიდენციალურობა",
    "privacy.title": "კონფიდენ\u00ADციალუ\u00ADრობის პოლიტიკა",
    "privacy.subtitle":
      "როგორ აგროვებს, იყენებს, უზიარებს და შლის არ გადააგდო შენს ინფორმაციას. ბოლო განახლება: 2026 წლის 5 ნოემბერი.",
    "privacy.infoTitle": "რა ინფორმაციას ვაგროვებთ",
    "privacy.infoText":
      "ანგარიში: შენი ელფოსტა და პაროლი (ავტორიზაციის პროვაიდერი მას მხოლოდ დაცული ჰეშის სახით ინახავს). პროფილის დეტალები, რომლებსაც თავად დაამატებ: სახელი და ტელეფონის ნომერი. აქტივობა: ჯავშნები, წაღების კოდები, შეკვეთისა და გადახდის სტატუსი, გაუქმებები, წაღებები და გამოუცხადებლობები, რჩეულები, შეფასებები და მიმოხილვის კომენტარები. ბიზნესები: ბიზნესის სახელი, ტიპი, მისამართი, ტელეფონი, შეთავაზებების დეტალები და ფოტოები, ასევე ანგარიშსწორებისთვის საბანკო ანგარიში (IBAN), რომელსაც ბიზნესი პირდაპირ გვაწვდის. მხარდაჭერა: შეტყობინებები, რომლებსაც გვიგზავნი. შენს მდებარეობასა და კონტაქტებზე წვდომა არ გვაქვს, ვიღებთ მხოლოდ იმ ფოტოებს, რომლებსაც ბიზნესი თავისი შეთავაზებისთვის ტვირთავს, და არ ვიყენებთ სარეკლამო ან ანალიტიკურ ტრეკერებს.",
    "privacy.verificationTitle": "ტელეფონისა და ბიზნესის ვერიფიკაცია",
    "privacy.verificationText":
      "მომხმარებლები: პირველ შეკვეთამდე გვჭირდება მობილურის ნომერი, რომელიც SMS კოდით დასტურდება; ერთი ნომერი მხოლოდ ერთ ანგარიშზე გამოიყენება. ნომერი და კოდი გადაეცემა ჩვენს SMS პროვაიდერს, ubill.ge-ს, მხოლოდ კოდის მისაწოდებლად. ბიზნესები: დამტკიცებამდე ასევე ვაგროვებთ კომპანიის იურიდიულ სახელს, საიდენტიფიკაციო კოდს და სამართლებრივ ფორმას, მფლობელის სრულ სახელს, SMS-ით დადასტურებულ ტელეფონის ნომერს, TBC-ის IBAN-ს და ამონაწერს საჯარო რეესტრიდან. ამონაწერი ინახება დახურულ საცავში, რომელსაც მხოლოდ ჩვენი ადმინისტრატორები კითხულობენ, და გამოიყენება მხოლოდ განაცხადის შესამოწმებლად. ანგარიშის წაშლისას იშლება შენი ტელეფონის ნომერი, მფლობელის სახელი და ამონაწერი; კომპანიის იურიდიული სახელი, საიდენტიფიკაციო კოდი და IBAN ინახება ანგარიშსწორების ჩანაწერებისთვის.",
    "privacy.accountTitle": "როგორ ვიყენებთ მას",
    "privacy.accountText":
      "ანგარიშის შესაქმნელად და დასაცავად, შეთავაზებების საჩვენებლად, ჯავშნებისა და გადახდების მისაღებად, ბიზნესებისთვის წაღების გადასამოწმებლად, ჯავშნებთან დაკავშირებული წერილების გასაგზავნად (დადასტურება, წაღების შეხსენება, გაუქმება და თანხის დაბრუნება), პლატფორმის სამართლიანობის შესანარჩუნებლად (მაგალითად, სანდოობის ქულა წაღებების, გაუქმებებისა და გამოუცხადებლობების მიხედვით) და მხარდაჭერის მოთხოვნებზე პასუხისთვის. ჩვენ არ ვყიდით შენს ინფორმაციას, არ ვაჩვენებთ რეკლამას და არ გადევნებთ თვალს სხვა აპებსა და ვებსაიტებზე.",
    "privacy.paymentsTitle": "გადახდები",
    "privacy.paymentsText":
      "ბარათით გადახდას თიბისი ბანკი ამუშავებს საკუთარ დაცულ გადახდის გვერდზე. არ გადააგდო ვერასდროს ხედავს და არ ინახავს შენი ბარათის მონაცემებს; ვიღებთ მხოლოდ გადახდის თანხასა და სტატუსს, რათა ჯავშანი დავადასტუროთ ან თანხა დაგიბრუნოთ.",
    "privacy.sharingTitle": "ვინ ხედავს ან იღებს შენს ინფორმაციას",
    "privacy.sharingText":
      "ბიზნესი, რომლისგანაც ჯავშნი, ხედავს შენს ჯავშანს, ანგარიშის ელფოსტასა და სანდოობის ქულას, რომ შეკვეთა გადმოგცეს. შეფასებები და მიმოხილვის კომენტარები საჯაროდ ჩანს ბიზნესის გვერდზე, შენი სახელისა და ელფოსტის გარეშე. მომსახურების მიმწოდებლები მონაცემებს ჩვენი სახელით მხოლოდ არ გადააგდოს მუშაობისთვის ამუშავებენ: Supabase (მონაცემთა ბაზა, ავტორიზაცია და ფაილების შენახვა), ჰოსტინგის პროვაიდერი, Resend (ელფოსტის მიწოდება) და თიბისი ბანკი (გადახდები). ისინი ვალდებულნი არიან, ინფორმაცია სულ მცირე ისევე დაიცვან, როგორც ჩვენ. ინფორმაცია შეიძლება ასევე გავამჟღავნოთ, თუ ამას კანონი მოითხოვს.",
    "privacy.ordersTitle": "რამდენ ხანს ვინახავთ",
    "privacy.ordersText":
      "ანგარიშის ინფორმაციას ვინახავთ, სანამ ანგარიში არსებობს. შეკვეთებისა და გადახდების ჩანაწერები საბუღალტრო ჩანაწერებია, ამიტომ ანგარიშის წაშლის შემდეგაც ვინახავთ, მაგრამ ისინი შენთან აღარ არის დაკავშირებული.",
    "privacy.deletionTitle": "ანგარიშის წაშლა",
    "privacy.deletionText":
      "ანგარიშის წაშლა ნებისმიერ დროს შეგიძლია აპში: პარამეტრები → ჩემი ანგარიშის წაშლა. ეს სამუდამოდ შლის შესვლის მონაცემებს, ელფოსტას, პროფილის დეტალებსა და რჩეულებს, ასევე შენს მიმოხილვის კომენტარებს. შეკვეთებისა და გადახდების ჩანაწერები ბუღალტრული აღრიცხვისთვის რჩება, მაგრამ შენთან აღარ არის დაკავშირებული. ბიზნეს ანგარიშის წაშლა ბიზნესსა და მის შეთავაზებებსაც მალავს. ასევე შეგიძლია მოგვწერო, თუ გინდა შენი ინფორმაციის ასლი, მისი გასწორება ან წაშლა.",
    "privacy.contactTitle": "კონტაქტი",
    "privacy.contactText":
      "კითხვები ან მოთხოვნები შენს ინფორმაციასთან დაკავშირებით: argadaagdo.support@gmail.com. ვცდილობთ, 1–2 სამუშაო დღეში გიპასუხოთ.",
    "privacy.helpTitle": "გაქვს კითხვა კონფიდენ\u00ADციალუ\u00ADრობაზე?",
    "privacy.helpText":
      "დაუკავშირდი არ გადააგდოს მხარდაჭერას ანგარიშის, შეკვეთის ან ბიზნესის ინფორმაციის შესახებ კითხვებისთვის.",

    "terms.badge": "წესები",
    "terms.title": "გამოყენების წესები",
    "terms.subtitle":
      "ეს მარტივი MVP წესები ხსნის ჯავშნების, წაღების, გაუქმების, შეფასებების და ბიზნეს დამტკიცების ძირითად წესებს.",
    "terms.reservationsTitle": "ჯავშნები",
    "terms.reservationsText":
      "მომხმარებლები ჯავშნიან ხელმისაწვდომ ლანჩ ბოქსებს დამტკიცებული ბიზნესებიდან. დაჯავშნით ადასტურებ, რომ შეკვეთას მითითებულ დროს წაიღებ.",
    "terms.pickupTitle": "წაღების პასუხისმგებლობა",
    "terms.pickupText":
      "მომხმარებელი პასუხისმგებელია ბიზნესში მითითებულ წაღების დროს მისვლაზე და „შეკვეთების“ გვერდიდან წაღების კოდის ჩვენებაზე.",
    "terms.cancellationTitle": "გაუქმების პოლიტიკა",
    "terms.cancellationText":
      "ჯავშნის გაუქმება შესაძლებელია მხოლოდ აპში ნაჩვენები დაშვებული გაუქმების ვადის ფარგლებში. დაგვიანებული გაუქმება შეიძლება ხელმისაწვდომი აღარ იყოს.",
    "terms.ratingsTitle": "შეფასებები და მიმოხილვები",
    "terms.ratingsText":
      "მომხმარებლებს შეუძლიათ დასრულებული წაღებების შეფასება. მიმოხილვები უნდა იყოს გულწრფელი, პატივისცემით დაწერილი და რეალურ დასრულებულ შეკვეთას ეფუძნებოდეს.",
    "terms.businessApprovalTitle": "ბიზნესის დამტკიცება",
    "terms.businessApprovalText":
      "ბიზნესები შეთავაზებების გამოქვეყნებამდე უნდა შემოწმდნენ და დამტკიცდნენ. არ გადააგდოს შეუძლია ბიზნესი ისევ მოლოდინში გადაიყვანოს, თუ დამატებითი შემოწმებაა საჭირო.",
    "terms.helpTitle": "გჭირდება განმარტება?",
    "terms.helpText":
      "გახსენი FAQ ან დაუკავშირდი მხარდაჭერას, თუ გაქვს კითხვა არ გადააგდოს მუშაობის შესახებ.",

    "footer.platform": "პლატფორმა",
    "footer.tbilisiFirst": "ჯერ თბილისი",
    "footer.reduceWaste": "საკვების ნარჩენის შემცირება",
    "footer.appStore": "ჩამოტვირთე App Store-დან",
    "footer.reduceWasteGeorgia": "შევამციროთ საკვების ნარჩენი საქართველოში",

    "notFound.title": "გვერდი ვერ მოიძებნა",
    "notFound.text": "ეს გვერდი არ არსებობს ან ბმული არასწორია.",

    "offline.badge": "კავშირი არ არის",
    "offline.title": "ოფლაინ ხარ",
    "offline.text":
      "ინტერნეტი არ არის. შეამოწმე და სცადე ხელახლა.",
    "offline.retry": "სცადე ხელახლა",
    "offline.home": "მთავარ გვერდზე გადასვლა",

  },
} satisfies Record<Language, Record<string, string>>;

export type TranslationKey = keyof (typeof translations)[typeof defaultLanguage];

export function isSupportedLanguage(value: string | null): value is Language {
  return supportedLanguages.includes(value as Language);
}

export function translate(language: Language, key: TranslationKey) {
  return translations[language][key] || translations[defaultLanguage][key];
}
