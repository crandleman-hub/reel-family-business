const placeholderCover =
  "https://dummyimage.com/500x750/626a75/f4f4f4&text=Cover+Art+Not+Found";

export const mockPins = ["1111", "2468", "FAMILY1"];

export const mockEntries = [
  {
    id: "1",
    title: "Love on the Spectrum",
    mediaType: "series",
    year: "2022",
    genres: ["Documentary", "Reality"],
    familyScore: 100,
    ageGuidance: 13,
    ratingLabel: "TV-14",
    review: "Warm, human, and thoughtful. Great family discussion starter.",
    pros: "Kind tone, authentic stories",
    cons: "A few mature topics to discuss first",
    coverUrl: placeholderCover,
    sourceLookupId: "tt13622108",
    sourceLookupProvider: "omdb",
    authorName: "Ian E",
    emoji: "🧠",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerPinHint: "1111"
  },
  {
    id: "2",
    title: "High School Musical",
    mediaType: "movie",
    year: "2006",
    genres: ["Comedy", "Musical"],
    familyScore: 70,
    ageGuidance: 8,
    ratingLabel: "G",
    review: "Fun energy and catchy songs. Great for younger family nights.",
    pros: "Songs, easy watch",
    cons: "Cheesy for some viewers",
    coverUrl: placeholderCover,
    sourceLookupId: "tt0475293",
    sourceLookupProvider: "omdb",
    authorName: "Chris",
    emoji: "🍿",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerPinHint: "2468"
  }
];
