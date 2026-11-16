export const LOCALE = "ro-RO"
export const TIME_ZONE = "Europe/Bucharest"

export const strings = {
  meta: {
    title: "ClubCheck — Descoperă evenimente",
    description:
      "Descoperă concerte, festivaluri și spectacole. Filtrează după oraș, locație, gen și dată.",
    heading: "Descoperă evenimente",
  },
  header: {
    homeLabel: "ClubCheck — pagina principală",
  },
  auth: {
    signIn: "Autentificare",
  },
  filters: {
    label: "Filtre",
    searchLabel: "Caută evenimente",
    searchPlaceholder: "Caută eveniment, artist sau locație",
    city: "Oraș",
    cityPlaceholder: "Toate orașele",
    venue: "Locație",
    venuePlaceholder: "Toate locațiile",
    genres: "Genuri",
    noGenres: "Genuri indisponibile.",
    optionsUnavailable: "Opțiuni indisponibile",
    date: "Dată",
    datePlaceholder: "Toate datele",
    today: "Astăzi",
    thisWeekend: "Weekendul acesta",
    apply: "Aplică",
    clearDates: "Golește datele",
    clearSearch: "Golește căutarea",
    clearAll: "Șterge toate filtrele",
    firstPage: "Mergi la prima pagină",
    lastPage: "Mergi la ultima pagină",
    removeFilter: (label: string) => `Elimină filtrul: ${label}`,
    searchChip: (query: string) => `Căutare: „${query}”`,
    cityChip: (city: string) => `Oraș: ${city}`,
    venueChip: (venue: string) => `Locație: ${venue}`,
    genreChip: (genre: string) => `Gen: ${genre}`,
    dateChip: (dates: string) => `Dată: ${dates}`,
    noCityResults: "Niciun oraș găsit.",
    noVenueResults: "Nicio locație găsită.",
  },
  results: {
    count: (formattedCount: string, isSingle: boolean) =>
      isSingle ? `${formattedCount} eveniment` : `${formattedCount} evenimente`,
    pageOf: (page: number, totalPages: number) => `Pagina ${page} din ${totalPages}`,
    pagination: "Paginare",
    previous: "Pagina anterioară",
    next: "Pagina următoare",
  },
  states: {
    emptyTitle: "Niciun eveniment găsit",
    emptyDescription: "Încearcă să modifici filtrele sau caută altceva.",
    emptyPageTitle: "Pagina nu există",
    emptyPageDescription: "Această pagină nu mai conține evenimente.",
    errorTitle: "Evenimentele nu au putut fi încărcate",
    errorDescription: "A apărut o problemă la conectarea cu serverul. Încearcă din nou.",
    retry: "Reîncearcă",
  },
  card: {
    posterAlt: (name: string) => `Afișul evenimentului ${name}`,
    dateUnknown: "Dată nespecificată",
  },
  price: {
    from: (amount: string) => `de la ${amount}`,
  },
  favorites: {
    add: "Adaugă la favorite",
    remove: "Elimină din favorite",
    signIn: "Autentifică-te pentru a salva evenimente",
  },
} as const
