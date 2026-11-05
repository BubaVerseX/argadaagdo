"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/lib/useLanguage";

const content = {
  ka: {
    badge: "ჩვენი მისია",
    title: "საკვები, რომელიც არ უნდა გადაიყაროს",
    sections: [
      {
        title: "გლობალური გამოწვევა.",
        text: "გაეროს გარემოსდაცვითი პროგრამის (UNEP) მონაცემებით, 2022 წელს მსოფლიოში 1.05 მილიარდი ტონა საკვები გადაიყარა — მომხმარებლისთვის ხელმისაწვდომი საკვების თითქმის მეხუთედი. ეს დღეში მილიარდზე მეტ კერძს უდრის, მაშინ როცა 783 მილიონი ადამიანი შიმშილს განიცდის. საკვების დანაკარგი და ნარჩენი გლობალური სათბურის გაზების ემისიის 8–10%-ს ქმნის, ხოლო მისი ეკონომიკური ღირებულება წელიწადში 1 ტრილიონ აშშ დოლარს აღემატება.",
      },
      {
        title: "მდგომარეობა საქართველოში.",
        text: "UNEP-ის შეფასებით, საქართველოში ერთი ადამიანი წელიწადში საშუალოდ 101 კგ საკვებს ყრის (შინამეურნეობები) — ჯამში 400 ათას ტონაზე მეტს. ნაგავსაყრელებზე მოხვედრილი ნარჩენების დაახლოებით 40% ორგანულია, ხოლო მოსახლეობის დაახლოებით 9.5% მძიმე სასურსათო დაუცველობის პირობებში ცხოვრობს.",
      },
      {
        title: "ჩვენი გადაწყვეტა.",
        text: "„არ გადააგდო\" საქართველოს საცხობებს, კაფეებს, რესტორნებსა და მაღაზიებს აძლევს საშუალებას, დღის ბოლოს დარჩენილი ხარისხიანი საკვები „ლანჩ ბოქსებში\" შესთავაზონ მომხმარებლებს ფასდაკლებით. მომხმარებელი ზოგავს, ბიზნესი იღებს დამატებით შემოსავალს, ქვეყანა კი ამცირებს ნარჩენს.",
      },
      {
        title: "ჩვენი გავლენა.",
        text: "ყოველი ლანჩ ბოქსი დაახლოებით 1 კგ საკვებს გადაარჩენს და დაახლოებით 2.7 კგ CO₂-ის ემისიას თავიდან აგვაცილებს.* (* შიდა შეფასება)",
      },
    ],
    methodNote:
      "101 კგ-ის მაჩვენებელი ეხება მხოლოდ შინამეურნეობებს. UNEP მას „საშუალო სანდოობის\" შეფასებად მიიჩნევს; საქართველოსთვის ის ეყრდნობა ქუთაისში ჩატარებულ კვლევას.",
    sourcesTitle: "წყაროები",
    sources: [
      "UNEP, საკვების ნარჩენების ინდექსის ანგარიში 2024",
      "UNEP 2021, bm.ge-ის მიხედვით",
      "ISET კვლევითი ინსტიტუტი, 2022",
    ],
  },
  en: {
    badge: "Our mission",
    title: "Food that shouldn't go to waste",
    sections: [
      {
        title: "A global challenge.",
        text: "According to the United Nations Environment Programme (UNEP), 1.05 billion tonnes of food were wasted worldwide in 2022 — almost one fifth of all food available to consumers. That equals more than a billion meals every day, while 783 million people go hungry. Food loss and waste produce 8–10% of global greenhouse gas emissions, and their economic cost exceeds US$1 trillion a year.",
      },
      {
        title: "The situation in Georgia.",
        text: "UNEP estimates that one person in Georgia throws away an average of 101 kg of food a year (households) — more than 400,000 tonnes in total. About 40% of the waste reaching landfills is organic, while around 9.5% of the population lives with severe food insecurity.",
      },
      {
        title: "Our solution.",
        text: "ArGadaagdo lets Georgia's bakeries, cafes, restaurants and shops offer good-quality food left at the end of the day to customers at a discount, in \"Lunch Boxes\". Customers save, businesses earn extra income, and the country reduces its waste.",
      },
      {
        title: "Our impact.",
        text: "Every Lunch Box rescues about 1 kg of food and avoids about 2.7 kg of CO₂ emissions.* (* internal estimate)",
      },
    ],
    methodNote:
      "The 101 kg figure covers households only. UNEP rates it as a medium-confidence estimate; for Georgia it draws on a study carried out in Kutaisi.",
    sourcesTitle: "Sources",
    sources: [
      "UNEP, Food Waste Index Report 2024",
      "UNEP 2021, via bm.ge",
      "ISET Policy Institute, 2022",
    ],
  },
};

const sourceUrls = [
  "https://sdg2advocacyhub.org/wp-content/uploads/2024/03/food_waste_index_report_2024.pdf",
  "https://bm.ge/en/news/931-million-tonnes-of-food-was-wasted-globally-403573-tonnes-in-georgia/81967",
  "https://iset-pi.ge/storage/media/other/2023-10-20/b93d2220-6f13-11ee-b309-5121f093db22.pdf",
];

export default function MissionPage() {
  const { language } = useLanguage();
  const copy = content[language];

  return (
    <main className="app-shell theme-web">
      <Navbar variant="web" />

      <article className="app-container max-w-3xl py-10 sm:py-14">
        <p className="text-[13px] tracking-[0.08em] text-body">{copy.badge}</p>
        <h1 className="mt-3 text-balance text-[2rem] leading-[1.25] sm:text-[2.75rem]">
          {copy.title}
        </h1>

        <div className="mt-8 grid gap-6">
          {copy.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-cream">{section.title}</h2>
              <p className="mt-2 leading-[1.75] text-body">{section.text}</p>
            </section>
          ))}
        </div>

        <p className="mt-8 border-t border-line pt-5 text-sm leading-6 text-body">
          {copy.methodNote}
        </p>

        <h2 className="mt-8 text-base font-semibold text-cream">{copy.sourcesTitle}</h2>
        <ul className="mt-3 grid gap-1 text-sm">
          {copy.sources.map((label, index) => (
            <li key={label}>
              <a
                href={sourceUrls[index]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-body underline underline-offset-4 hover:text-cream"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </article>

      <Footer />
    </main>
  );
}
