// 장르 정보: family(계열)로 묶어서 "같은 계열"인지 판단해요.
const GENRES = {
  "house":            { name: "하우스",             family: "house",  desc: "4/4박자 '쿵-쿵-쿵-쿵' 킥 위에 따뜻한 리듬이 반복되는, 클럽 음악의 뿌리 같은 장르." },
  "deep-house":       { name: "딥 하우스",          family: "house",  desc: "하우스보다 느긋하고 부드러운 코드, 깊은 베이스가 특징인 차분한 하우스." },
  "tech-house":       { name: "테크 하우스",        family: "house",  desc: "하우스의 그루브에 테크노의 단단한 드럼과 베이스를 섞은 장르. 베이스 라인이 핵심." },
  "afro-house":       { name: "아프로 하우스",      family: "house",  desc: "아프리카 타악기 리듬과 주술적인 보컬을 하우스 비트에 얹은 장르." },
  "progressive-house":{ name: "프로그레시브 하우스", family: "house",  desc: "천천히 쌓아 올렸다가 터뜨리는 웅장한 전개와 멜로디가 특징인 하우스." },
  "melodic-house":    { name: "멜로딕 하우스",      family: "house",  desc: "감성적인 멜로디와 몽환적인 분위기를 강조하는 하우스." },
  "nu-disco":         { name: "뉴 디스코",          family: "house",  desc: "70~80년대 디스코를 현대적인 전자음으로 다시 만든 밝고 펑키한 장르." },
  "techno":           { name: "테크노",             family: "techno", desc: "반복적이고 기계적인 리듬, 어둡고 미니멀한 사운드로 몰입감을 만드는 장르." },
  "melodic-techno":   { name: "멜로딕 테크노",      family: "techno", desc: "테크노의 단단한 리듬 위에 감성적인 신스 멜로디를 얹은 장르." },
  "trance":           { name: "트랜스",             family: "trance", desc: "빠른 템포와 반복되는 아르페지오, 고조되는 멜로디로 황홀감을 주는 장르." },
  "dnb":              { name: "드럼 앤 베이스",     family: "dnb",    desc: "170~175 BPM의 아주 빠른 브레이크비트와 묵직한 베이스가 특징." },
  "liquid-dnb":       { name: "리퀴드 드럼 앤 베이스", family: "dnb", desc: "빠른 DnB 리듬에 부드러운 코드와 보컬을 얹은 감성적인 DnB." },
  "jungle":           { name: "정글",               family: "dnb",    desc: "잘게 쪼갠 브레이크비트와 레게풍 베이스가 특징인, DnB의 원조 격 장르." },
  "dubstep":          { name: "덥스텝",             family: "bass",   desc: "140 BPM의 하프타임 리듬과 '워블'하는 거대한 베이스가 주인공인 장르." },
  "uk-bass":          { name: "UK 베이스",          family: "bass",   desc: "덥스텝·그라임·개러지가 섞인 영국식 베이스 음악. 묵직한 저음과 MC 랩이 특징." },
  "future-bass":      { name: "퓨처 베이스",        family: "bass",   desc: "출렁이는 신스 코드, 하프타임 리듬, 감성적인 멜로디가 특징인 장르." },
  "uk-garage":        { name: "UK 개러지",          family: "garage", desc: "통통 튀는 엇박 드럼(2-step)과 소울풀한 보컬이 특징인 영국 장르." },
  "breakbeat":        { name: "브레이크비트",       family: "breaks", desc: "정박 킥 대신 쪼개진 드럼 루프(브레이크)를 쓰는 리듬 중심 장르." },
  "downtempo":        { name: "다운템포",           family: "chill",  desc: "느린 템포의 편안하고 감성적인 전자음악. 공부·휴식용으로도 인기." },
  "idm":              { name: "IDM",                family: "chill",  desc: "춤보다 감상을 위한 실험적이고 섬세한 전자음악." },
  "synthwave":        { name: "신스웨이브",         family: "retro",  desc: "80년대 영화·게임 사운드트랙을 떠올리게 하는 복고풍 신스 음악." }
};

// 서로 가까운 계열 (완전히 같진 않지만 사운드가 겹치는 장르군)
const RELATED_FAMILIES = [
  ["house", "techno"], ["house", "garage"], ["house", "chill"], ["house", "trance"], ["house", "breaks"],
  ["techno", "trance"], ["techno", "breaks"],
  ["bass", "dnb"], ["bass", "garage"], ["breaks", "garage"], ["breaks", "dnb"],
  ["chill", "retro"], ["chill", "bass"]
];

const FAMILY_NAMES = {
  house: "하우스 계열", techno: "테크노 계열", trance: "트랜스 계열",
  dnb: "드럼 앤 베이스 계열", bass: "베이스 뮤직 계열", garage: "UK 개러지 계열",
  breaks: "브레이크비트 계열", chill: "칠/다운템포 계열", retro: "레트로/신스 계열"
};

// 애플뮤직 장르명 → 이 사이트의 장르 ("Dance", "Electronic"처럼 넓은 장르는 매핑하지 않아요)
const APPLE_GENRE_MAP = {
  "House": "house", "Deep House": "deep-house", "Tech House": "tech-house", "Afro House": "afro-house",
  "Progressive House": "progressive-house", "Melodic House & Techno": "melodic-techno",
  "Techno": "techno", "Trance": "trance", "Dubstep": "dubstep", "Bass": "uk-bass",
  "Drum & Bass": "dnb", "Jungle": "jungle", "Breakbeat": "breakbeat", "UK Garage": "uk-garage", "Garage": "uk-garage",
  "Downtempo": "downtempo", "Ambient": "downtempo", "IDM/Experimental": "idm", "Nu-Disco": "nu-disco", "Disco": "nu-disco"
};
const ELECTRONIC_GENRE_RE = /dance|electr|house|techno|trance|step|bass|jungle|break|downtempo|ambient|garage|hard|idm|disco/i;

// 2020년 이후 발매곡만 다뤄요
const MIN_YEAR = 2020;

// 사람이 정리한 장르·분위기 정보. BPM·베이스·에너지·밝기는 미리듣기 음원을 분석해서 채워요.
// vocal: "vocal"(보컬 중심) | "sample"(보컬 샘플/짧은 구절) | "inst"(연주곡)
const CURATED = [
  { title: "(It Goes Like) Nanana", artist: "Peggy Gou", year: 2023, genre: "house", mood: ["밝은", "그루비", "향수"], vocal: "vocal" },
  { title: "I Go", artist: "Peggy Gou", year: 2021, genre: "house", mood: ["그루비", "향수"], vocal: "vocal" },
  { title: "Marea (We've Lost Dancing)", artist: "Fred again..", year: 2021, genre: "house", mood: ["서정적", "몽환적", "그루비"], vocal: "sample" },
  { title: "Delilah (pull me out of this)", artist: "Fred again..", year: 2022, genre: "house", mood: ["서정적", "강렬한"], vocal: "sample" },
  { title: "Turn On The Lights again..", artist: "Fred again..", year: 2022, genre: "house", mood: ["강렬한", "신나는"], vocal: "vocal" },
  { title: "adore u", artist: "Fred again..", year: 2024, genre: "house", mood: ["밝은", "서정적"], vocal: "vocal" },
  { title: "B.O.T.A. (Baddest Of Them All)", artist: "Eliza Rose", year: 2022, genre: "house", mood: ["밝은", "향수", "신나는"], vocal: "vocal" },
  { title: "Enjoy Your Life", artist: "Romy", year: 2023, genre: "house", mood: ["밝은", "향수"], vocal: "vocal" },
  { title: "Never Come Back", artist: "Caribou", year: 2020, genre: "house", mood: ["밝은", "서정적"], vocal: "vocal" },
  { title: "Tondo", artist: "Disclosure", year: 2020, genre: "house", mood: ["펑키", "그루비"], vocal: "vocal" },
  { title: "Prada", artist: "Cassö", year: 2023, genre: "house", mood: ["어두운", "그루비"], vocal: "vocal" },
  { title: "Remember", artist: "Becky Hill", year: 2021, genre: "house", mood: ["밝은", "서정적"], vocal: "vocal" },
  { title: "Somedays", artist: "Sonny Fodera", year: 2023, genre: "house", mood: ["밝은", "그루비"], vocal: "vocal" },
  { title: "Hypnotized", artist: "Purple Disco Machine", year: 2020, genre: "nu-disco", mood: ["밝은", "펑키", "향수"], vocal: "vocal" },
  { title: "Substitution", artist: "Purple Disco Machine", year: 2021, genre: "nu-disco", mood: ["밝은", "펑키"], vocal: "vocal" },
  { title: "Rhyme Dust", artist: "MK", year: 2023, genre: "tech-house", mood: ["그루비", "신나는"], vocal: "vocal" },
  { title: "Drugs From Amsterdam", artist: "Mau P", year: 2022, genre: "tech-house", mood: ["그루비", "강렬한"], vocal: "vocal" },
  { title: "A Drug From God", artist: "Chris Lake", year: 2021, genre: "tech-house", mood: ["어두운", "몽환적", "그루비"], vocal: "sample" },
  { title: "Move", artist: "Adam Port", year: 2023, genre: "afro-house", mood: ["그루비", "미니멀", "몽환적"], vocal: "vocal" },
  { title: "Where You Are", artist: "John Summit", year: 2023, genre: "progressive-house", mood: ["서정적", "웅장한"], vocal: "vocal" },
  { title: "Escape", artist: "Kx5", year: 2022, genre: "progressive-house", mood: ["서정적", "웅장한", "몽환적"], vocal: "vocal" },
  { title: "Moth To A Flame", artist: "Swedish House Mafia", year: 2021, genre: "progressive-house", mood: ["어두운", "몽환적"], vocal: "vocal" },
  { title: "It Gets Better", artist: "Swedish House Mafia", year: 2021, genre: "progressive-house", mood: ["강렬한", "웅장한"], vocal: "sample" },
  { title: "Alive", artist: "RÜFÜS DU SOL", year: 2021, genre: "melodic-house", mood: ["서정적", "웅장한"], vocal: "vocal" },
  { title: "On My Knees", artist: "RÜFÜS DU SOL", year: 2021, genre: "melodic-house", mood: ["어두운", "강렬한"], vocal: "vocal" },
  { title: "Eternity", artist: "Anyma", year: 2022, genre: "melodic-techno", mood: ["어두운", "웅장한", "몽환적"], vocal: "vocal" },
  { title: "Doppler", artist: "Charlotte de Witte", year: 2021, genre: "techno", mood: ["어두운", "강렬한", "미니멀"], vocal: "inst" },
  { title: "Miracle", artist: "Calvin Harris", year: 2023, genre: "trance", mood: ["웅장한", "서정적", "밝은"], vocal: "vocal" },
  { title: "The Business", artist: "Tiësto", year: 2020, genre: "house", mood: ["밝은", "신나는"], vocal: "vocal" },
  { title: "Atlas", artist: "Bicep", year: 2020, genre: "breakbeat", mood: ["몽환적", "웅장한"], vocal: "inst" },
  { title: "Apricots", artist: "Bicep", year: 2020, genre: "breakbeat", mood: ["몽환적", "서정적"], vocal: "sample" },
  { title: "So U Kno", artist: "Overmono", year: 2021, genre: "breakbeat", mood: ["그루비", "몽환적"], vocal: "sample" },
  { title: "Good Lies", artist: "Overmono", year: 2023, genre: "breakbeat", mood: ["그루비", "서정적"], vocal: "sample" },
  { title: "Baby", artist: "Four Tet", year: 2020, genre: "idm", mood: ["몽환적", "서정적"], vocal: "sample" },
  { title: "Rosewood", artist: "Bonobo", year: 2021, genre: "downtempo", mood: ["몽환적", "그루비"], vocal: "inst" },
  { title: "Rumble", artist: "Skrillex", year: 2022, genre: "uk-bass", mood: ["어두운", "강렬한"], vocal: "vocal" },
  { title: "Say Nothing", artist: "Flume", year: 2022, genre: "future-bass", mood: ["서정적", "몽환적"], vocal: "vocal" },
  { title: "Look at the Sky", artist: "Porter Robinson", year: 2021, genre: "future-bass", mood: ["밝은", "서정적", "웅장한"], vocal: "vocal" },
  { title: "Something Comforting", artist: "Porter Robinson", year: 2020, genre: "future-bass", mood: ["서정적", "향수"], vocal: "vocal" },
  { title: "Nightlight", artist: "ILLENIUM", year: 2021, genre: "future-bass", mood: ["웅장한", "서정적"], vocal: "vocal" },
  { title: "The Last Goodbye", artist: "ODESZA", year: 2022, genre: "future-bass", mood: ["웅장한", "서정적"], vocal: "sample" },
  { title: "Strangers", artist: "Kenya Grace", year: 2023, genre: "liquid-dnb", mood: ["몽환적", "서정적"], vocal: "vocal" },
  { title: "Baddadan", artist: "Chase & Status", year: 2023, genre: "dnb", mood: ["강렬한", "신나는"], vocal: "vocal" },
  { title: "Driver", artist: "Pendulum", year: 2020, genre: "dnb", mood: ["강렬한", "어두운"], vocal: "vocal" },
  { title: "Baianá", artist: "Nia Archives", year: 2022, genre: "jungle", mood: ["그루비", "밝은"], vocal: "vocal" },
  { title: "Pain", artist: "PinkPantheress", year: 2021, genre: "uk-garage", mood: ["서정적", "향수"], vocal: "vocal" },
  { title: "Renegade", artist: "Kavinsky", year: 2022, genre: "synthwave", mood: ["향수", "어두운"], vocal: "vocal" }
].filter((t) => t.year >= MIN_YEAR).map((t, i) => ({ id: `c${i}`, curated: true, ...t }));

// 장르별 대표 아티스트: 이 아티스트들의 2020년 이후 곡을 애플뮤직에서 후보로 가져와요.
const GENRE_ARTISTS = {
  "house": ["Fred again..", "Peggy Gou", "Disclosure", "Jamie xx", "Romy", "KAYTRANADA", "Channel Tres", "Honey Dijon", "Sonny Fodera", "Gorgon City", "Duke Dumont", "Folamour"],
  "deep-house": ["Kerri Chandler", "Ben Böhmer", "Nora En Pure", "Lane 8"],
  "tech-house": ["FISHER", "Chris Lake", "Mau P", "Dom Dolla", "John Summit", "Max Dean", "Cloonee", "Biscits", "Chris Stussy"],
  "afro-house": ["Black Coffee", "Keinemusik", "&ME", "Rampa", "Adam Port", "Hugel", "Themba"],
  "progressive-house": ["Eric Prydz", "Swedish House Mafia", "Yotto", "Tinlicker", "Kx5", "Massane"],
  "melodic-house": ["RÜFÜS DU SOL", "Ben Böhmer", "Lane 8", "Kasablanca", "Monolink"],
  "nu-disco": ["Purple Disco Machine", "Roosevelt", "Dimitri From Paris", "Crazy P"],
  "melodic-techno": ["Anyma", "Tale Of Us", "Argy", "Innellea", "Stephan Bodzin", "Mathame", "Colyn", "Kevin de Vries"],
  "techno": ["Charlotte de Witte", "Amelie Lens", "Sara Landry", "I Hate Models", "Indira Paganotto", "Adam Beyer", "Enrico Sangiuliano", "Reinier Zonneveld", "Kobosil", "999999999"],
  "trance": ["Armin van Buuren", "Above & Beyond", "Cosmic Gate", "Ferry Corsten", "Gareth Emery", "Ilan Bluestone"],
  "dnb": ["Chase & Status", "Pendulum", "Sub Focus", "Dimension", "Culture Shock", "Andy C", "Bou", "Hedex"],
  "liquid-dnb": ["Wilkinson", "Netsky", "Hybrid Minds", "Kenya Grace", "Venbee", "Monrroe"],
  "jungle": ["Nia Archives", "Tim Reaper", "Sherelle"],
  "dubstep": ["Excision", "Subtronics", "ISOxo", "Zeds Dead"],
  "uk-bass": ["Skrillex", "Hamdi", "Flowdan", "Joy Orbison"],
  "future-bass": ["Flume", "Porter Robinson", "ILLENIUM", "ODESZA", "San Holo", "Louis The Child", "Madeon", "Said The Sky"],
  "uk-garage": ["PinkPantheress", "Sammy Virji", "Interplanetary Criminal", "Conducta", "Salute"],
  "breakbeat": ["Overmono", "Bicep", "TSHA", "Skee Mask"],
  "downtempo": ["Bonobo", "Tycho", "Floating Points", "Jon Hopkins", "Kiasmos", "Rival Consoles", "Barry Can't Swim"],
  "idm": ["Four Tet", "Aphex Twin", "Jon Hopkins", "Floating Points"],
  "synthwave": ["Kavinsky", "The Midnight", "FM-84", "Gunship", "Timecop1983", "Perturbator"]
};

const MOODS = ["밝은", "어두운", "몽환적", "서정적", "펑키", "그루비", "강렬한", "공격적", "웅장한", "미니멀", "향수", "차분한", "신나는"];
