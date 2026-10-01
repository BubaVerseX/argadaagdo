import type { Language } from "@/lib/i18n";

// Georgian versions of user-facing messages that reach the UI in English:
// messages produced by shared code (lib/errors.ts, lib/auth.ts, lib/orders.ts),
// `error` strings returned by API routes (app/api/payments/*), and fixed
// messages that pages keep in state (often set from effects, where the current
// language is not available).
//
// Pages keep the English text in state and translate it when rendering, so
// the English output never changes and a message that is not listed here is
// shown unchanged. Keep each English key identical to its source string.
const georgianMessageEntries: Array<[string, string]> = [
  // lib/errors.ts — generic fallback and known RPC errors.
  [
    "Something went wrong. Please try again in a moment.",
    "მოხდა შეცდომა. გთხოვ, ცოტა ხანში სცადე ხელახლა.",
  ],
  [
    "You already have an active reservation for this offer. Open your orders to finish or cancel it.",
    "ამ შეთავაზებაზე უკვე გაქვს აქტიური ჯავშანი. გახსენი შეკვეთები, რომ დაასრულო ან გააუქმო.",
  ],
  [
    "You already have 3 active reservations. Complete or cancel one before reserving another.",
    "უკვე გაქვს 3 აქტიური ჯავშანი. ახალი ჯავშნის გაკეთებამდე ერთ-ერთი დაასრულე ან გააუქმე.",
  ],
  ["This offer is sold out.", "ეს შეთავაზება გაყიდულია."],
  [
    "This offer is no longer available. It may be expired, sold out, or inactive.",
    "ეს შეთავაზება აღარ არის ხელმისაწვდომი. შესაძლოა, ვადა გაუვიდა, გაიყიდა ან არააქტიურია.",
  ],
  [
    "Only customer accounts in good standing can reserve offers.",
    "შეთავაზებების დაჯავშნა მხოლოდ შეზღუდვის არმქონე მომხმარებლის ანგარიშებს შეუძლიათ.",
  ],
  [
    "Online payment is temporarily unavailable. Please try again later.",
    "ონლაინ გადახდა დროებით მიუწვდომელია. გთხოვ, მოგვიანებით სცადე.",
  ],
  [
    "Cancellation deadline has passed. You can cancel only up to 2 hours before pickup.",
    "გაუქმების ვადა ამოიწურა. გაუქმება შესაძლებელია მხოლოდ წაღებამდე 2 საათით ადრე.",
  ],
  [
    "Only confirmed reservations can be cancelled.",
    "გაუქმება მხოლოდ დადასტურებული ჯავშნებისთვისაა შესაძლებელი.",
  ],
  [
    "Please sign in and try again.",
    "გთხოვ, შედი ანგარიშში და სცადე ხელახლა.",
  ],
  // lib/errors.ts — heuristic messages.
  [
    "This action is not allowed for your account. Please sign in again or contact support.",
    "ეს მოქმედება შენი ანგარიშისთვის დაშვებული არ არის. გთხოვ, ხელახლა შედი ანგარიშში ან დაუკავშირდი მხარდაჭერას.",
  ],
  [
    "Network problem. Please check your connection and try again.",
    "კავშირის პრობლემა. გთხოვ, შეამოწმე ინტერნეტთან კავშირი და სცადე ხელახლა.",
  ],
  [
    "Marketplace data is temporarily unavailable. Please try again in a moment.",
    "მარკეტის მონაცემები დროებით მიუწვდომელია. გთხოვ, ცოტა ხანში სცადე ხელახლა.",
  ],
  [
    "Image storage is temporarily unavailable. Please try again with the image in a moment.",
    "სურათების საცავი დროებით მიუწვდომელია. გთხოვ, სურათის ატვირთვა ცოტა ხანში სცადე ხელახლა.",
  ],
  [
    "This offer is no longer available.",
    "ეს შეთავაზება აღარ არის ხელმისაწვდომი.",
  ],
  [
    "Pickup code could not be verified. Please check the code and try again.",
    "წაღების კოდი ვერ დადასტურდა. გთხოვ, შეამოწმე კოდი და სცადე ხელახლა.",
  ],
  [
    "Cancellation window has closed for this reservation.",
    "ამ ჯავშნის გაუქმების ფანჯარა დახურულია.",
  ],
  ["Email or password is incorrect.", "ელფოსტა ან პაროლი არასწორია."],
  [
    "This item already exists. Please refresh and try again.",
    "ეს ჩანაწერი უკვე არსებობს. გთხოვ, განაახლე გვერდი და სცადე ხელახლა.",
  ],

  // app/api/payments/checkout and app/api/payments/refund.
  [
    "Secure checkout could not be started. Please try again.",
    "უსაფრთხო გადახდის დაწყება ვერ მოხერხდა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "Please sign in to reserve this offer.",
    "ამ შეთავაზების დასაჯავშნად, გთხოვ, შეხვიდე ანგარიშში.",
  ],
  [
    "This offer is not available for checkout.",
    "ეს შეთავაზება გადახდისთვის ხელმისაწვდომი არ არის.",
  ],
  [
    "Reservation could not be cancelled. Please try again.",
    "ჯავშნის გაუქმება ვერ მოხერხდა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "Please sign in to cancel this order.",
    "შეკვეთის გასაუქმებლად, გთხოვ, შეხვიდე ანგარიშში.",
  ],
  [
    "This order is not available for cancellation.",
    "ეს შეკვეთა გაუქმებისთვის ხელმისაწვდომი არ არის.",
  ],
  [
    "Bank refund could not be confirmed. Please try again.",
    "ბანკმა თანხის დაბრუნება ვერ დაადასტურა. გთხოვ, სცადე ხელახლა.",
  ],

  // lib/auth.ts (VERIFY_EMAIL_BEFORE_ACCESS_MESSAGE is also returned by the
  // payment API routes).
  [
    "Please verify your email before using ArGadaagdo.",
    "ArGadaagdo-ს გამოსაყენებლად, გთხოვ, ჯერ დაადასტურე ელფოსტა.",
  ],
  [
    "Account created. Please verify your email before continuing. Check your inbox for the verification email, then sign in again.",
    "ანგარიში შეიქმნა. გაგრძელებამდე, გთხოვ, დაადასტურე ელფოსტა. იპოვე დადასტურების წერილი შემოსულებში და შემდეგ ხელახლა შედი ანგარიშში.",
  ],
  [
    "Account created. You can sign in now.",
    "ანგარიში შეიქმნა. ახლა შეგიძლია შეხვიდე.",
  ],
  [
    "Please verify your email before signing in. Check your inbox and spam folder for the confirmation link.",
    "შესვლამდე, გთხოვ, დაადასტურე ელფოსტა. დადასტურების ბმული მოძებნე შემოსულებსა და სპამის საქაღალდეში.",
  ],

  // lib/orders.ts — getCancellationErrorMessage.
  [
    "This order could not be found or no longer belongs to your account.",
    "ეს შეკვეთა ვერ მოიძებნა ან აღარ ეკუთვნის შენს ანგარიშს.",
  ],
  [
    "Order could not be cancelled. Please try again.",
    "შეკვეთის გაუქმება ვერ მოხერხდა. გთხოვ, სცადე ხელახლა.",
  ],

  // Checkout page.
  ["This checkout link is not valid.", "გადახდის ეს ბმული არასწორია."],
  [
    "Checkout could not be loaded. Please try again.",
    "გადახდის გვერდი ვერ ჩაიტვირთა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "This offer is no longer available for checkout.",
    "ეს შეთავაზება გადახდისთვის აღარ არის ხელმისაწვდომი.",
  ],
  [
    "Reservation could not be completed. Please try again.",
    "ჯავშნის დასრულება ვერ მოხერხდა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "Please confirm that you understand the pickup and cancellation rules.",
    "გთხოვ, დაადასტურე, რომ გესმის წაღებისა და გაუქმების წესები.",
  ],
  [
    "This offer is no longer available for reservation.",
    "ეს შეთავაზება დასაჯავშნად აღარ არის ხელმისაწვდომი.",
  ],

  // Orders page (including the payment return messages).
  [
    "Payment confirmed. Your pickup code is ready below.",
    "გადახდა დადასტურდა. წაღების კოდი ქვემოთ გელოდება.",
  ],
  [
    "Payment is still being confirmed. Refresh this page in a moment.",
    "გადახდა ჯერ კიდევ მოწმდება. ცოტა ხანში განაახლე ეს გვერდი.",
  ],
  [
    "Payment was not completed, so this reservation was not confirmed.",
    "გადახდა არ დასრულებულა, ამიტომ ჯავშანი არ დადასტურდა.",
  ],
  [
    "We received your payment, but the reservation could not be confirmed automatically. Please contact support so we can confirm it or refund you.",
    "გადახდა მივიღეთ, მაგრამ ჯავშნის ავტომატურად დადასტურება ვერ მოხერხდა. გთხოვ, დაუკავშირდი მხარდაჭერას, რომ ჯავშანი დავადასტუროთ ან თანხა დაგიბრუნოთ.",
  ],
  [
    "Orders could not be loaded. Please try again.",
    "შეკვეთები ვერ ჩაიტვირთა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "Choose a star rating before submitting your review.",
    "შეფასების გაგზავნამდე აირჩიე ვარსკვლავების რაოდენობა.",
  ],
  [
    "Your review could not be saved. Please try again.",
    "შეფასება ვერ შეინახა. გთხოვ, სცადე ხელახლა.",
  ],
  ["Thanks. Your review was saved.", "მადლობა. შენი შეფასება შენახულია."],
  ["Reservation cancelled.", "ჯავშანი გაუქმდა."],

  // Offers, offer details and favorites pages.
  [
    "Offers could not be loaded. Please try again.",
    "შეთავაზებები ვერ ჩაიტვირთა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "Favorites are available for customer accounts.",
    "რჩეულები ხელმისაწვდომია მომხმარებლის ანგარიშებისთვის.",
  ],
  [
    "Favorite could not be removed. Please try again.",
    "რჩეულებიდან წაშლა ვერ მოხერხდა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "Favorite could not be saved. Please try again.",
    "რჩეულებში შენახვა ვერ მოხერხდა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "Favorites could not be loaded. Please try again.",
    "რჩეულები ვერ ჩაიტვირთა. გთხოვ, სცადე ხელახლა.",
  ],

  // Profile and settings pages.
  [
    "Your account profile is still being prepared. Please refresh in a moment.",
    "შენი ანგარიშის პროფილი ჯერ კიდევ მზადდება. გთხოვ, ცოტა ხანში განაახლე გვერდი.",
  ],
  [
    "Account details could not be saved. Please try again.",
    "ანგარიშის მონაცემები ვერ შეინახა. გთხოვ, სცადე ხელახლა.",
  ],
  ["Account details saved.", "ანგარიშის მონაცემები შენახულია."],

  // Homepage, discover and business directory.
  [
    "Featured offers could not be loaded right now.",
    "რჩეული შეთავაზებები ახლა ვერ ჩაიტვირთა.",
  ],
  [
    "Discover could not be loaded. Please try again.",
    "აღმოჩენის გვერდი ვერ ჩაიტვირთა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "Businesses could not be loaded. Please try again.",
    "ბიზნესები ვერ ჩაიტვირთა. გთხოვ, სცადე ხელახლა.",
  ],

  // Login page.
  [
    "Email or password is incorrect. Please try again.",
    "ელფოსტა ან პაროლი არასწორია. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "This email may already have an account. Try signing in or checking your confirmation email.",
    "ამ ელფოსტით ანგარიში შესაძლოა უკვე არსებობს. სცადე შესვლა ან შეამოწმე დადასტურების წერილი.",
  ],
  [
    "Authentication could not be completed. Please try again.",
    "ავტორიზაცია ვერ დასრულდა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "Please sign in to manage your account settings.",
    "ანგარიშის პარამეტრების სამართავად, გთხოვ, შეხვიდე ანგარიშში.",
  ],
  ["Email is required.", "ელფოსტა სავალდებულოა."],
  ["Enter a valid email address.", "შეიყვანე სწორი ელფოსტის მისამართი."],
  [
    "Password must be at least 6 characters.",
    "პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს.",
  ],
  [
    "Password cannot start or end with spaces.",
    "პაროლი არ შეიძლება იწყებოდეს ან მთავრდებოდეს ჰარით.",
  ],
  ["Creating account...", "ანგარიში იქმნება..."],
  ["Password is required.", "პაროლი სავალდებულოა."],
  ["Signing in...", "მიმდინარეობს შესვლა..."],
  [
    "Signed in. Your profile is still being prepared, so dashboard links may appear after a refresh.",
    "შესვლა შესრულდა. შენი პროფილი ჯერ კიდევ მზადდება, ამიტომ პანელის ბმულები შეიძლება გვერდის განახლების შემდეგ გამოჩნდეს.",
  ],
  [
    "Enter your email address first, then request a new verification link.",
    "ჯერ შეიყვანე ელფოსტის მისამართი, შემდეგ მოითხოვე ახალი დადასტურების ბმული.",
  ],
  ["Sending verification email...", "დადასტურების წერილი იგზავნება..."],
  [
    "Verification email could not be sent. Please wait a moment and try again.",
    "დადასტურების წერილი ვერ გაიგზავნა. გთხოვ, ცოტა მოიცადე და სცადე ხელახლა.",
  ],
  [
    "Verification email sent. Please check your inbox and spam folder.",
    "დადასტურების წერილი გაიგზავნა. გთხოვ, შეამოწმე შემოსულები და სპამის საქაღალდე.",
  ],
  [
    "Enter your email address first, then request a reset link.",
    "ჯერ შეიყვანე ელფოსტის მისამართი, შემდეგ მოითხოვე აღდგენის ბმული.",
  ],
  ["Sending password reset email...", "პაროლის აღდგენის წერილი იგზავნება..."],
  [
    "Password reset email could not be sent. Please try again.",
    "პაროლის აღდგენის წერილი ვერ გაიგზავნა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "Password reset email sent. Please check your inbox.",
    "პაროლის აღდგენის წერილი გაიგზავნა. გთხოვ, შეამოწმე შემოსულები.",
  ],
  [
    "New password must be at least 6 characters.",
    "ახალი პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს.",
  ],
  [
    "New password cannot start or end with spaces.",
    "ახალი პაროლი არ შეიძლება იწყებოდეს ან მთავრდებოდეს ჰარით.",
  ],
  ["Passwords do not match.", "პაროლები არ ემთხვევა."],
  ["Updating password...", "პაროლი ახლდება..."],
  [
    "Password could not be updated. Please request a new reset link.",
    "პაროლი ვერ განახლდა. გთხოვ, მოითხოვე ახალი აღდგენის ბმული.",
  ],
  [
    "Password updated. You can continue using ArGadaagdo.",
    "პაროლი განახლდა. შეგიძლია გააგრძელო ArGadaagdo-ს გამოყენება.",
  ],

  // Business registration page.
  [
    "Your account profile is still being created. Please wait a moment and try again.",
    "შენი ანგარიშის პროფილი ჯერ კიდევ იქმნება. გთხოვ, ცოტა მოიცადე და სცადე ხელახლა.",
  ],
  [
    "Only business accounts can register a business.",
    "ბიზნესის რეგისტრაცია მხოლოდ ბიზნეს ანგარიშებს შეუძლიათ.",
  ],
  ["Please sign in first.", "გთხოვ, ჯერ შედი ანგარიშში."],
  [
    "You already have a business application waiting for admin approval.",
    "უკვე გაქვს ბიზნესის განაცხადი, რომელიც ადმინის დამტკიცებას ელოდება.",
  ],
  [
    "Business registration was blocked by security rules. Please make sure you are signed in and try again.",
    "ბიზნესის რეგისტრაცია უსაფრთხოების წესებმა დაბლოკა. გთხოვ, დარწმუნდი, რომ ანგარიშში შესული ხარ, და სცადე ხელახლა.",
  ],
  [
    "Business registration could not be submitted. Please check the details and try again.",
    "ბიზნესის რეგისტრაცია ვერ გაიგზავნა. გთხოვ, შეამოწმე მონაცემები და სცადე ხელახლა.",
  ],
  [
    "Business submitted. Waiting for admin approval.",
    "ბიზნესი გაიგზავნა. ელოდება ადმინის დამტკიცებას.",
  ],

  // Business dashboard (app/business/dashboard/page.tsx and
  // lib/business/dashboard.ts image validation).
  [
    "Your business information could not be loaded.",
    "ბიზნესის ინფორმაცია ვერ ჩაიტვირთა.",
  ],
  ["Your offers could not be loaded.", "შენი შეთავაზებები ვერ ჩაიტვირთა."],
  ["Reservations could not be loaded.", "ჯავშნები ვერ ჩაიტვირთა."],
  [
    "Please wait a moment before saving again.",
    "ხელახლა შენახვამდე, გთხოვ, ცოტა მოიცადე.",
  ],
  [
    "Choose one of your businesses before saving profile changes.",
    "პროფილის ცვლილებების შენახვამდე აირჩიე შენი ერთ-ერთი ბიზნესი.",
  ],
  [
    "The selected business is still loading. Please wait a moment and try again.",
    "არჩეული ბიზნესი ჯერ კიდევ იტვირთება. გთხოვ, ცოტა მოიცადე და სცადე ხელახლა.",
  ],
  [
    "Profile update was blocked. Please make sure you are signed in as this business owner.",
    "პროფილის განახლება დაიბლოკა. გთხოვ, დარწმუნდი, რომ ამ ბიზნესის მფლობელის ანგარიშით ხარ შესული.",
  ],
  [
    "Business profile could not be updated. Please try again.",
    "ბიზნესის პროფილი ვერ განახლდა. გთხოვ, სცადე ხელახლა.",
  ],
  ["Business profile updated.", "ბიზნესის პროფილი განახლდა."],
  [
    "Image upload failed. Please try a smaller JPG, PNG, or WebP file.",
    "სურათი ვერ აიტვირთა. გთხოვ, სცადე უფრო მცირე ზომის JPG, PNG ან WebP ფაილი.",
  ],
  [
    "Image is too large. Please upload a file under 5MB.",
    "სურათი ძალიან დიდია. გთხოვ, ატვირთე 5MB-ზე მცირე ფაილი.",
  ],
  [
    "Invalid image type. Please use JPG, PNG, or WebP.",
    "სურათის ფორმატი არასწორია. გთხოვ, გამოიყენე JPG, PNG ან WebP.",
  ],
  [
    "Please wait a moment before publishing another offer.",
    "შემდეგი შეთავაზების გამოქვეყნებამდე, გთხოვ, ცოტა მოიცადე.",
  ],
  [
    "Choose an approved business before publishing an offer.",
    "შეთავაზების გამოქვეყნებამდე აირჩიე დამტკიცებული ბიზნესი.",
  ],
  [
    "Add an offer title. Example: Bakery Surprise Bag.",
    "დაამატე შეთავაზების სათაური. მაგალითად: საცხობის სიურპრიზის ყუთი.",
  ],
  [
    "Your business is not approved yet.",
    "შენი ბიზნესი ჯერ არ არის დამტკიცებული.",
  ],
  [
    "Add a valid discounted price greater than 0.",
    "მიუთითე სწორი ფასდაკლებული ფასი, რომელიც 0-ზე მეტია.",
  ],
  [
    "Original price must be greater than 0, or leave it empty.",
    "საწყისი ფასი 0-ზე მეტი უნდა იყოს, ან დატოვე ველი ცარიელი.",
  ],
  [
    "Original price must be higher than the discounted price, or leave it empty.",
    "საწყისი ფასი ფასდაკლებულ ფასზე მაღალი უნდა იყოს, ან დატოვე ველი ცარიელი.",
  ],
  [
    "Quantity must be a whole number greater than 0.",
    "რაოდენობა 0-ზე მეტი მთელი რიცხვი უნდა იყოს.",
  ],
  ["Choose a category for this offer.", "აირჩიე ამ შეთავაზების კატეგორია."],
  [
    "Add a pickup date, start time and end time.",
    "მიუთითე წაღების თარიღი, დაწყებისა და დასრულების დრო.",
  ],
  [
    "Pickup end time must be after pickup start time.",
    "წაღების დასრულების დრო დაწყების დროზე გვიან უნდა იყოს.",
  ],
  [
    "Pickup date cannot be in the past.",
    "წაღების თარიღი წარსულში ვერ იქნება.",
  ],
  [
    "This pickup window has already ended. Choose a later time.",
    "წაღების ეს ფანჯარა უკვე დასრულდა. აირჩიე უფრო გვიანი დრო.",
  ],
  ["Publishing offer...", "შეთავაზება ქვეყნდება..."],
  [
    "Offer creation was blocked. Please make sure this business is approved and you are signed in as its owner.",
    "შეთავაზების შექმნა დაიბლოკა. გთხოვ, დარწმუნდი, რომ ბიზნესი დამტკიცებულია და მისი მფლობელის ანგარიშით ხარ შესული.",
  ],
  [
    "Offer could not be published. Please check the details and try again.",
    "შეთავაზება ვერ გამოქვეყნდა. გთხოვ, შეამოწმე მონაცემები და სცადე ხელახლა.",
  ],
  [
    "Offer published. It is now visible to customers.",
    "შეთავაზება გამოქვეყნდა. ის ახლა მომხმარებლებს უჩანთ.",
  ],
  [
    "You can only edit offers from your own business.",
    "შეგიძლია მხოლოდ შენი ბიზნესის შეთავაზებების რედაქტირება.",
  ],
  ["Price must be greater than 0.", "ფასი 0-ზე მეტი უნდა იყოს."],
  ["Old price must be greater than 0.", "ძველი ფასი 0-ზე მეტი უნდა იყოს."],
  ["Quantity must be 0 or greater.", "რაოდენობა 0 ან მეტი უნდა იყოს."],
  ["Category required.", "კატეგორია სავალდებულოა."],
  [
    "Pickup start and end time are required.",
    "წაღების დაწყებისა და დასრულების დრო სავალდებულოა.",
  ],
  ["Pickup date is required.", "წაღების თარიღი სავალდებულოა."],
  [
    "This pickup window has already ended. Choose a later date or time.",
    "წაღების ეს ფანჯარა უკვე დასრულდა. აირჩიე უფრო გვიანი თარიღი ან დრო.",
  ],
  [
    "Offer changes could not be saved. Please try again.",
    "შეთავაზების ცვლილებები ვერ შეინახა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "New reservations came in while you were editing, so the quantity was not changed. Check the current quantity and try again.",
    "რედაქტირებისას ახალი ჯავშნები შემოვიდა, ამიტომ რაოდენობა არ შეცვლილა. შეამოწმე მიმდინარე რაოდენობა და სცადე ხელახლა.",
  ],
  ["Offer could not be updated.", "შეთავაზება ვერ განახლდა."],
  ["Offer updated.", "შეთავაზება განახლდა."],
  [
    "You can only update offers from your own business.",
    "შეგიძლია მხოლოდ შენი ბიზნესის შეთავაზებების განახლება.",
  ],
  [
    "Expired offers cannot be reactivated. Duplicate the offer and choose a new pickup date.",
    "ვადაგასული შეთავაზების ხელახლა გააქტიურება შეუძლებელია. შექმენი მისი ასლი და აირჩიე წაღების ახალი თარიღი.",
  ],
  [
    "Quantity must be greater than 0 before activating an offer.",
    "შეთავაზების გააქტიურებამდე რაოდენობა 0-ზე მეტი უნდა იყოს.",
  ],
  [
    "Offer status could not be updated. Please try again.",
    "შეთავაზების სტატუსი ვერ განახლდა. გთხოვ, სცადე ხელახლა.",
  ],
  ["Offer activated.", "შეთავაზება გააქტიურდა."],
  ["Offer set inactive.", "შეთავაზება არააქტიური გახდა."],
  [
    "You can only duplicate offers from your own business.",
    "ასლის შექმნა მხოლოდ შენი ბიზნესის შეთავაზებებისთვისაა შესაძლებელი.",
  ],
  [
    "Offer could not be duplicated. Please try again.",
    "შეთავაზების ასლი ვერ შეიქმნა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "Offer duplicated as inactive. Edit the pickup date and activate it when ready.",
    "შეთავაზების ასლი შეიქმნა არააქტიური სტატუსით. შეცვალე წაღების თარიღი და გაააქტიურე, როცა მზად იქნები.",
  ],
  [
    "You can only archive offers from your own business.",
    "შეგიძლია მხოლოდ შენი ბიზნესის შეთავაზებების დაარქივება.",
  ],
  [
    "Only expired offers can be archived.",
    "დაარქივება მხოლოდ ვადაგასული შეთავაზებებისთვისაა შესაძლებელი.",
  ],
  [
    "Expired offer could not be archived. Please try again.",
    "ვადაგასული შეთავაზება ვერ დაარქივდა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "Expired offer archived in history.",
    "ვადაგასული შეთავაზება ისტორიაში დაარქივდა.",
  ],
  [
    "You can only delete offers from your own business.",
    "შეგიძლია მხოლოდ შენი ბიზნესის შეთავაზებების წაშლა.",
  ],
  [
    "This offer has reservations, so it cannot be deleted. Set it inactive instead.",
    "ამ შეთავაზებას ჯავშნები აქვს, ამიტომ მისი წაშლა შეუძლებელია. სანაცვლოდ გახადე არააქტიური.",
  ],
  [
    "Offer could not be deleted. Please try again.",
    "შეთავაზება ვერ წაიშალა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "This offer could not be deleted. Offers that already have reservations can't be deleted — set it inactive instead.",
    "ეს შეთავაზება ვერ წაიშალა. ჯავშნების მქონე შეთავაზებების წაშლა შეუძლებელია — სანაცვლოდ გახადე არააქტიური.",
  ],
  ["Offer deleted.", "შეთავაზება წაიშალა."],
  [
    "Pickup code required to complete an order.",
    "შეკვეთის დასასრულებლად წაღების კოდი სავალდებულოა.",
  ],
  [
    "Pickup could not be completed. Please check the pickup code and try again.",
    "წაღება ვერ დასრულდა. გთხოვ, შეამოწმე წაღების კოდი და სცადე ხელახლა.",
  ],
  [
    "The pickup window had already ended, so this order could not be completed.",
    "წაღების ფანჯარა უკვე დასრულებული იყო, ამიტომ ეს შეკვეთა ვერ დასრულდა.",
  ],
  ["Pickup completed successfully.", "წაღება წარმატებით დასრულდა."],
  ["Pickup code is required.", "წაღების კოდი სავალდებულოა."],
  ["Pickup code does not match.", "წაღების კოდი არ ემთხვევა."],
  [
    "Pickup could not be completed. Check the code, or close this window to see the details.",
    "წაღება ვერ დასრულდა. შეამოწმე კოდი ან დახურე ეს ფანჯარა დეტალების სანახავად.",
  ],
  [
    "Order could not be marked no-show. Please try again.",
    "შეკვეთის მონიშვნა სტატუსით „არ გამოცხადდა“ ვერ მოხერხდა. გთხოვ, სცადე ხელახლა.",
  ],
  [
    "Order marked as no-show.",
    "შეკვეთა მოინიშნა სტატუსით „არ გამოცხადდა“.",
  ],
];

const georgianMessages = new Map<string, string>(georgianMessageEntries);

/**
 * Returns the Georgian version of a known English user-facing message when
 * `language` is "ka". English, empty and unknown messages are returned
 * unchanged.
 */
export function translateUserMessage(
  message: string,
  language: Language
): string {
  if (language !== "ka" || !message) return message;

  return georgianMessages.get(message) ?? message;
}
