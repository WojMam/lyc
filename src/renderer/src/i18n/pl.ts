export const pl = {
  appName: 'Local YouTube Companion',
  nav: {
    home: 'Analiza',
    downloads: 'Pobrania',
    library: 'Biblioteka',
    settings: 'Ustawienia'
  },
  home: {
    title: 'Wklej link YouTube',
    subtitle: 'Najpierw analiza i podgląd — pobieranie tylko na Twoje żądanie.',
    placeholder: 'https://www.youtube.com/watch?v=…',
    analyze: 'Analizuj',
    paste: 'Wklej',
    clear: 'Wyczyść',
    analyzing: 'Analizowanie…',
    emptyTitle: 'Gotowy do analizy',
    emptyBody: 'Wklej adres filmu lub playlisty, aby zobaczyć metadane, dostępne jakości i napisy.',
    chooseVideo: 'Ten film',
    choosePlaylist: 'Cała playlista',
    ambiguousHint: 'Link zawiera też playlistę. Wybierz, co chcesz przeanalizować.'
  },
  preview: {
    channel: 'Kanał',
    duration: 'Czas',
    views: 'Wyświetlenia',
    uploaded: 'Opublikowano',
    videoId: 'ID',
    resolutions: 'Dostępne rozdzielczości',
    captions: 'Napisy',
    chapters: 'Rozdziały',
    manual: 'ręczne',
    automatic: 'automatyczne',
    noCaptions: 'Brak dostępnych napisów',
    description: 'Opis',
    actions: 'Akcje',
    downloadVideo: 'Pobierz wideo',
    downloadAudio: 'Pobierz audio',
    downloadTranscript: 'Pobierz transkrypt',
    downloadThumbnail: 'Pobierz miniaturę',
    exportMetadata: 'Eksportuj metadane',
    exportDescription: 'Eksportuj opis',
    exportChapters: 'Eksportuj rozdziały'
  },
  playlist: {
    items: 'pozycji',
    selectAll: 'Zaznacz wszystkie',
    deselectAll: 'Odznacz wszystkie',
    downloadSelected: 'Pobierz zaznaczone',
    unavailable: 'Niedostępne',
    selected: 'zaznaczono'
  },
  dialog: {
    quality: 'Jakość',
    qualityBest: 'Najlepsza dostępna',
    qualityUpTo: 'Najlepsza do wybranej',
    qualityExact: 'Dokładna rozdzielczość',
    qualityExactHint: 'Jeśli dokładna jakość nie istnieje, pobieranie zakończy się błędem.',
    qualityUpToHint: 'Jeśli wybrana jakość nie istnieje, użyta zostanie niższa dostępna.',
    container: 'Kontener',
    containerAuto: 'Automatyczny',
    outputDir: 'Folder docelowy',
    browse: 'Wybierz…',
    start: 'Rozpocznij',
    cancel: 'Anuluj',
    audioFormat: 'Format audio',
    audioQuality: 'Jakość audio',
    language: 'Język',
    preferManual: 'Preferuj napisy ręczne',
    transcriptFormat: 'Format eksportu',
    includeRaw: 'Dołącz surowy JSON yt-dlp (zaawansowane)',
    embedMetadata: 'Osadź metadane'
  },
  downloads: {
    title: 'Kolejka pobierań',
    empty: 'Brak aktywnych ani niedawnych zadań.',
    queued: 'W kolejce',
    downloading: 'Pobieranie',
    processing: 'Przetwarzanie',
    completed: 'Ukończono',
    failed: 'Błąd',
    canceled: 'Anulowano',
    interrupted: 'Przerwano',
    analyzing: 'Analiza',
    retry: 'Ponów',
    remove: 'Usuń',
    openFile: 'Otwórz plik',
    openFolder: 'Otwórz folder',
    cancelJob: 'Anuluj',
    clearCompleted: 'Wyczyść ukończone'
  },
  library: {
    title: 'Historia',
    empty: 'Historia jest pusta. Ukończone i nieudane pobrania pojawią się tutaj.'
  },
  settings: {
    title: 'Ustawienia',
    general: 'Ogólne',
    downloads: 'Pobrania',
    tools: 'Narzędzia',
    downloadDir: 'Domyślny folder pobierań',
    language: 'Język',
    appearance: 'Wygląd',
    themeSystem: 'Systemowy',
    themeDark: 'Ciemny',
    themeLight: 'Jasny',
    openFolderOnComplete: 'Otwórz folder po ukończeniu',
    preferredQuality: 'Preferowana jakość wideo',
    preferredContainer: 'Preferowany kontener',
    preferredAudio: 'Preferowany format audio',
    preferredTranscriptLang: 'Preferowany język napisów',
    existingFile: 'Istniejące pliki',
    maxConcurrent: 'Maks. równoległych pobierań',
    maxRetries: 'Ponowienia',
    toolHealth: 'Stan narzędzi',
    exportLogs: 'Eksportuj logi diagnostyczne',
    available: 'Dostępne',
    missing: 'Brak',
    invalid: 'Nieprawidłowe',
    outdated: 'Nieaktualne',
    saved: 'Zapisano'
  },
  errors: {
    technicalDetails: 'Szczegóły techniczne',
    retry: 'Spróbuj ponownie'
  },
  common: {
    loading: 'Ładowanie…',
    error: 'Błąd',
    success: 'Sukces'
  }
}

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>
}

export type MessageCatalog = DeepStringify<typeof pl>
