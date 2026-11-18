// 장르 설명의 대표곡: 애플뮤직 미리듣기 정보를 미리 찾아 저장해 뒀어요 (아이폰에서도 바로 재생돼요).
const GENRE_TRACKS = {
 "house": [
  {
   "title": "Your Love",
   "artist": "Frankie Knuckles",
   "year": 1987,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/63/f8/4a/63f84a51-4542-e2f0-ce9a-1e82c88e190a/mzaf_6582318388118202976.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/1f/b9/db/1fb9db01-804f-6f37-7e66-ce50016e9473/196626085405.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/your-love/1601915653?i=1601915661&uo=4"
  },
  {
   "title": "Can You Feel It",
   "artist": "Mr. Fingers",
   "year": 1986,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/20/11/a8/2011a847-6530-d3a3-f692-93964167b92c/mzaf_3911902257412834512.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/f1/e8/c1/f1e8c10a-df1a-2a90-4dc6-0c903d6432ac/827170141889.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/can-you-feel-it/1272313113?i=1272313498&uo=4"
  },
  {
   "title": "Show Me Love",
   "artist": "Robin S.",
   "year": 1993,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/df/80/2d/df802df9-5ef8-ceff-9525-d2635bdcd01c/mzaf_12123587685204224481.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/8f/fc/e8/8ffce812-173c-5d0d-a264-07f81247c212/mzi.cdsdlqei.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/show-me-love/301002604?i=301002607&uo=4"
  },
  {
   "title": "Music Sounds Better With You",
   "artist": "Stardust, Benjamin Diamond & Alan Braxe",
   "year": 1998,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview123/v4/48/37/0a/48370a8e-7800-a8e3-bb0c-870049366529/mzaf_11073762965865818798.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/45/75/5a/45755a39-7130-1327-a629-32dd55ce050c/5060686502620_cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/music-sounds-better-with-you/1472251125?i=1472251299&uo=4"
  },
  {
   "title": "Losing It",
   "artist": "FISHER",
   "year": 2018,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/5e/73/3e/5e733e6a-ddae-6081-dbbd-0be7e9542e60/mzaf_15726405558792372151.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b6/d0/78/b6d078c6-5a24-063e-548e-0d28af65dab9/18UMGIM41789.rgb.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/losing-it/1408454984?i=1408454985&uo=4"
  }
 ],
 "techno": [
  {
   "title": "Strings of Life",
   "artist": "Rhythim Is Rhythim",
   "year": 1987,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/34/bd/6b/34bd6ba7-c99d-1a24-6178-b499240133d1/mzaf_9818915045852185348.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/80/f6/a1/80f6a147-3841-dc7f-12d2-629e6d4cddd6/10063.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/strings-of-life/1831059984?i=1831059987&uo=4"
  },
  {
   "title": "The Bells",
   "artist": "Jeff Mills",
   "year": 1996,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/fa/57/48/fa5748f2-1095-ef01-8f1f-8a31d32b26ae/mzaf_3113520192662463232.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/6e/e2/6e/6ee26ea3-caae-3a42-e757-576c69165d04/SSAScover_DigitalL.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/the-bells/1482201224?i=1482201234&uo=4"
  },
  {
   "title": "Spastik",
   "artist": "Plastikman",
   "year": 1993,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/71/78/f3/7178f389-3451-1a6e-d145-d778dff444eb/mzaf_15621981303545075686.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/84/79/10/8479109c-ac3d-ff06-0fbf-f04338b0c7c8/192641482243_Cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/spastik/1508238849?i=1508239038&uo=4"
  },
  {
   "title": "Your Mind",
   "artist": "Adam Beyer & Bart Skils",
   "year": 2018,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/10/82/86/1082864e-6e48-3a13-09dd-0fdb0ddbc465/mzaf_2202216974941995702.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/cd/db/ac/cddbac70-8dd5-d3e6-b7df-0c8d4a49c6f5/3596974455399_cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/your-mind/1699222388?i=1699223195&uo=4"
  },
  {
   "title": "Higher",
   "artist": "Amelie Lens",
   "year": 2019,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/da/22/60/da22609d-c830-0600-620a-f641d4f139ae/mzaf_10913306840320656064.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/4b/50/c5/4b50c5e5-8e01-8851-9fd3-a88578636fb9/5414165117964.png/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/higher/1523022737?i=1523022738&uo=4"
  }
 ],
 "trance": [
  {
   "title": "Children",
   "artist": "Robert Miles",
   "year": 1995,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6c/59/d6/6c59d6d8-81ea-43ca-7ec8-e48ba7ee876a/mzaf_2513405837490625233.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/d5/00/56/d5005629-9beb-f05a-fee0-b243b8681099/078221893022.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/children-dream-version/270572717?i=270572798&uo=4"
  },
  {
   "title": "For an Angel",
   "artist": "Paul van Dyk",
   "year": 1994,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/e2/e6/11/e2e611f5-e135-d686-238c-9b1a48b8dad0/mzaf_4634444305467232709.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/c3/b1/74/c3b1749a-7fd1-5c7a-d806-b83bdcd26b9c/cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/for-an-angel/1463197954?i=1463197973&uo=4"
  },
  {
   "title": "9 PM (Till I Come)",
   "artist": "ATB",
   "year": 1998,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ed/65/c6/ed65c684-fa81-0429-7d8f-c3689bf7d59b/mzaf_4958447962772826455.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/7d/7e/23/7d7e23dc-1c95-35b9-45b5-d4217f32d0e4/cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/9-pm-till-i-come/67702633?i=67702581&uo=4"
  },
  {
   "title": "Sandstorm",
   "artist": "Darude",
   "year": 1999,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/41/18/93/41189355-9033-e6e4-d7ce-97a7515e7aa9/mzaf_17924145138458674060.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music/01/a1/c8/mzi.tqopjuka.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/sandstorm/338349017?i=338349243&uo=4"
  },
  {
   "title": "Adagio for Strings",
   "artist": "Tiësto",
   "year": 2004,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/25/f8/bb/25f8bbdf-747c-8655-b8df-a6663cc15abe/mzaf_7120256370063596647.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/81/56/6b/81566b3b-d506-7aa1-7e9b-be839de21283/8718522112799.png/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/adagio-for-strings/1151514345?i=1151514609&uo=4"
  }
 ],
 "dnb": [
  {
   "title": "Inner City Life",
   "artist": "Goldie",
   "year": 1994,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f8/53/11/f8531121-7185-6809-b5ef-b77951dc3258/mzaf_1283873732990396984.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/d0/2c/15/d02c15b5-c6a6-27e7-cff3-8d0796e12700/190295567484.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/inner-city-life/1420032783?i=1420032789&uo=4"
  },
  {
   "title": "Brown Paper Bag",
   "artist": "Roni Size & Reprazent",
   "year": 1997,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/ea/09/09/ea090988-61a2-368c-bea8-d713496a6aa6/mzaf_14140430433487707236.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/bf/b5/49/bfb549f3-b875-ba13-4bff-57fc9d8898b4/5400863130701_cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/brown-paper-bag/1669463148?i=1669463175&uo=4"
  },
  {
   "title": "Tarantula",
   "artist": "Pendulum",
   "year": 2005,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/09/f3/12/09f3128f-5c55-349e-bc7e-3f68e54a23a8/mzaf_14889421680239389409.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/44/f9/88/44f9888a-5085-5256-9605-c0d525316571/5060072303626.png/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/tarantula-feat-fresh-%24pyda-tenor-fly/899158906?i=899159193&uo=4"
  },
  {
   "title": "Blind Faith",
   "artist": "Chase & Status",
   "year": 2011,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/34/5e/8d/345e8df7-9560-b934-e863-d9e14fa90da8/mzaf_12793952362841477633.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/3e/06/f2/3e06f23e-3722-42a8-64e2-ef12d872adcf/10UMGIM33675.rgb.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/blind-faith-feat-liam-bailey/1440717125?i=1440717200&uo=4"
  },
  {
   "title": "Afterglow",
   "artist": "Wilkinson & Becky Hill",
   "year": 2013,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/01/dc/d5/01dcd5d5-4288-bdeb-d17c-326847b0a623/mzaf_17056931991896504307.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/a6/c2/dd/a6c2dd60-c59e-0633-5290-f299ab9e500a/19UMGIM81338.rgb.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/afterglow/1483907569?i=1483907765&uo=4"
  }
 ],
 "dubstep": [
  {
   "title": "Midnight Request Line",
   "artist": "Skream",
   "year": 2005,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/fe/a5/4a/fea54af6-f6fc-a882-88cc-57275ef20769/mzaf_6443905931034488882.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/68/d4/ec/68d4ece5-7093-5b87-bb2c-a649c10358f7/800071006259.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/midnight-request-line/1790763787?i=1790764001&uo=4"
  },
  {
   "title": "Night",
   "artist": "Benga & Coki",
   "year": 2007,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/75/37/04/753704bb-1094-6efc-41e1-55ec69ff114c/mzaf_13089414485916032295.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/d8/59/22/d8592203-2376-d243-b516-084a1949853c/800071006242.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/night/1790764175?i=1790764182&uo=4"
  },
  {
   "title": "Archangel",
   "artist": "Burial",
   "year": 2007,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/fd/80/ea/fd80eabb-293c-3f0f-f8eb-aa2fe01092e7/mzaf_11630702710896917232.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/9d/0f/1c/9d0f1c2b-2fae-d8ac-3920-ce9ec5bc85b5/7982.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/archangel/893175779?i=893175788&uo=4"
  },
  {
   "title": "Scary Monsters and Nice Sprites",
   "artist": "Skrillex",
   "year": 2010,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/82/7f/74/827f74d1-47f2-c6d6-055a-3a3954a8446a/mzaf_75818061699536254.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/31/70/da/3170da66-9280-ccd2-1f97-57d8a1996f9e/075679970930.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/scary-monsters-and-nice-sprites/409001929?i=409001935&uo=4"
  },
  {
   "title": "Bass Cannon",
   "artist": "Flux Pavilion",
   "year": 2011,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/ca/79/77/ca797791-5877-9e5c-507d-5db45b8f33d7/mzaf_2104711822418582014.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music4/v4/c6/bd/80/c6bd80fd-5f18-5a28-0583-eb519f01710a/5055199507217.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/bass-cannon/694647297?i=694647892&uo=4"
  }
 ],
 "uk-garage": [
  {
   "title": "Re-Rewind (The Crowd Say Bo Selecta)",
   "artist": "Artful Dodger",
   "year": 1999,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f7/a6/33/f7a6335a-6a2f-c841-33d1-e41537e0a679/mzaf_8769649500872644858.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/fb/60/5f/fb605f3a-498e-ed59-0c3f-2737c938eefe/5032698646524.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/re-rewind-the-crowd-say-bo-selecta-feat-craig-david/1745073171?i=1745073177&uo=4"
  },
  {
   "title": "Sincere",
   "artist": "MJ Cole",
   "year": 1998,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/6b/87/33/6b873365-a081-9e57-e1c0-d72faec71cf4/mzaf_13690149273985296828.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/ac/45/03/ac450361-918a-02aa-bfc1-ba658ce4a2b1/7290005218408_Cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/sincere/1640046952?i=1640047218&uo=4"
  },
  {
   "title": "Sweet Like Chocolate",
   "artist": "Shanks & Bigfoot",
   "year": 1999,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/f2/bd/53/f2bd53ad-5be5-0f19-aa5c-5ad0bba8f3e1/mzaf_15066096506690712465.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/2c/63/6b/2c636b9b-496a-c80f-42b1-0adea72936b7/859706300385_cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/sweet-like-chocolate-radio-edit/446380173?i=446380222&uo=4"
  },
  {
   "title": "Flowers",
   "artist": "Sweet Female Attitude",
   "year": 2000,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/3b/45/07/3b4507d7-fc58-87ab-1180-d27b3b30799b/mzaf_5690114423272462792.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ad/36/f1/ad36f186-e0cf-9573-4243-912cf42843ae/mzm.gingixgt.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/flowers-c-j-mix/1036141510?i=1036142354&uo=4"
  },
  {
   "title": "Latch",
   "artist": "Disclosure & Sam Smith",
   "year": 2012,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/4f/44/94/4f4494e5-8a5e-c9ef-548e-760cabd4fd80/mzaf_644961378672752727.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/57/93/e0/5793e0d6-4877-e015-ef54-3fd4eff87344/14UMGIM12348.rgb.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/latch/1440862011?i=1440862129&uo=4"
  }
 ],
 "breakbeat": [
  {
   "title": "Block Rockin' Beats",
   "artist": "The Chemical Brothers",
   "year": 1997,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/33/59/7b/33597bcb-8c82-6882-de18-7e2c28188c67/mzaf_8665126214156159651.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/54/c6/e4/54c6e459-524b-790c-80d6-5dee6cde1633/00724384295059.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/block-rockin-beats/714366008?i=714366406&uo=4"
  },
  {
   "title": "The Rockafeller Skank",
   "artist": "Fatboy Slim",
   "year": 1998,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/0c/ef/6a/0cef6a5f-3295-1432-ee91-9762ed7eefb8/mzaf_11308969120491565742.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/45/1a/16/451a1673-1aa4-63e7-cfca-8a44ce9d0779/14ULAIM03599.rgb.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/the-rockafeller-skank/714927896?i=714928145&uo=4"
  },
  {
   "title": "Firestarter",
   "artist": "The Prodigy",
   "year": 1996,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/fe/f0/48/fef048ad-df35-bbce-dc88-05e424cadba7/mzaf_15874742277122495094.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/96/8b/08/968b08e4-cb2b-54c2-32bb-dba77ad1c2ca/634904912161.png/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/firestarter/500162127?i=500162235&uo=4"
  },
  {
   "title": "Glue",
   "artist": "Bicep",
   "year": 2017,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/7c/9c/f6/7c9cf6b3-424a-3cce-96c3-c192b2f6e566/mzaf_4559815962369019993.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/79/cf/44/79cf445f-4b04-7a27-54a4-cdf57cf1d6ac/5054429119084.png/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/glue/1240586047?i=1240586502&uo=4"
  },
  {
   "title": "So U Kno",
   "artist": "Overmono",
   "year": 2021,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6d/2f/af/6d2fafee-ead0-06d9-d142-e50a54337adc/mzaf_4749641114964555761.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/e9/6d/1a/e96d1ab0-0176-685c-1f4d-01e73e91a925/191404901076.png/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/so-u-kno/1659656223?i=1659656557&uo=4"
  }
 ],
 "ambient": [
  {
   "title": "1/1",
   "artist": "Brian Eno",
   "year": 1978,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/bf/4d/76/bf4d76df-83ae-eafa-aa13-16ce3881a6b3/mzaf_6194359874510546862.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/ee/71/42/ee71425d-6bc9-3df8-c90b-8539f59144ab/00724386649553.rgb.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/1-1/724435863?i=724436237&uo=4"
  },
  {
   "title": "Xtal",
   "artist": "Aphex Twin",
   "year": 1992,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/a1/a9/59/a1a9593a-f705-ca02-495f-2d83f83e4e49/mzaf_282027520707936830.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/5f/b3/e0/5fb3e08d-c2cd-3da4-6ad7-c5dc61803683/cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/xtal/1668862636?i=1668862649&uo=4"
  },
  {
   "title": "Little Fluffy Clouds",
   "artist": "The Orb",
   "year": 1990,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/fa/4b/53/fa4b5371-48db-15d1-e1c4-02eee6e1b861/mzaf_9390303102660190947.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/e6/d9/94/e6d994a2-585a-4940-ff6d-5b4d73b330b2/06UMGIM03957.rgb.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/little-fluffy-clouds/1452851519?i=1452851522&uo=4"
  },
  {
   "title": "14:31",
   "artist": "Global Communication",
   "year": 1994,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/1a/f8/9b/1af89b98-2a79-064c-b695-2e7c9e417f4a/mzaf_6280723830488634931.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/52/a1/cd/52a1cdb5-d9a2-6b25-16e1-cdcd837bb959/196871096614.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/14-31/1687117665?i=1687118020&uo=4"
  },
  {
   "title": "Weightless",
   "artist": "Marconi Union",
   "year": 2011,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/65/69/07/656907c9-eb54-c59c-72b9-dad8489a0165/mzaf_3316991574698499044.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c3/3a/d6/c33ad6a3-ec91-62e4-0912-d4a873d4fed0/cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/weightless/571977211?i=571977598&uo=4"
  }
 ],
 "chillout": [
  {
   "title": "Teardrop",
   "artist": "Massive Attack",
   "year": 1998,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/a3/a6/91/a3a691b0-8e49-399d-2585-ddcd6694c9f2/mzaf_16325826545413166648.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/0a/98/55/0a98555b-8d9d-3b46-660a-b91261557d17/00724384559953.rgb.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/teardrop/724466069?i=724466700&uo=4"
  },
  {
   "title": "Glory Box",
   "artist": "Portishead",
   "year": 1994,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/40/b2/a4/40b2a45b-eacf-818f-7af6-f7f8b3885230/mzaf_16256497095178600689.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/c1/71/93/c1719342-df7d-e9c5-c87c-53dae5afb289/00042282855329.rgb.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/glory-box/1440653096?i=1440653206&uo=4"
  },
  {
   "title": "La femme d'argent",
   "artist": "Air",
   "year": 1998,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ab/65/30/ab65300f-3134-9391-4f1a-329e2bbd946b/mzaf_743568926842265821.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/d1/f9/26/d1f926e7-e996-7166-3744-0710a82177ac/017046664455.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/la-femme-dargent/693063670?i=693063876&uo=4"
  },
  {
   "title": "Kerala",
   "artist": "Bonobo",
   "year": 2016,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/7b/50/f2/7b50f2d2-4ead-9f1c-986f-a780d26a9d12/mzaf_3026587138333977214.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/be/f1/d0/bef1d063-ed73-bd7d-3899-2217762cdcda/5054429005721.png/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/kerala/1169245868?i=1169246072&uo=4"
  },
  {
   "title": "Awake",
   "artist": "Tycho",
   "year": 2014,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/04/35/47/043547d9-84f3-6bfa-96d0-44264264b090/mzaf_2326799450272337125.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/7b/b8/d6/7bb8d640-dfdc-1473-3948-4060af9a3819/804297820828.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/awake/793928184?i=793928278&uo=4"
  }
 ],
 "disco": [
  {
   "title": "I Feel Love",
   "artist": "Donna Summer",
   "year": 1977,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f6/f2/f0/f6f2f08a-a788-a354-b5ed-b4a71f8a58da/mzaf_11155681679719877923.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/82/13/19/8213190b-60a9-95cd-9cc0-0948e08a085a/06UMGIM05259.rgb.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/i-feel-love/1442959303?i=1442959426&uo=4"
  },
  {
   "title": "Chase",
   "artist": "Giorgio Moroder",
   "year": 1978,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/67/79/e9/6779e958-fa20-ed88-7472-70483c3c91e6/mzaf_7683306115142507665.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/d9/10/a3/d910a357-d9d2-69e3-d880-1a781bbafca7/06UMGIM04409.rgb.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/chase/1443529341?i=1443529354&uo=4"
  },
  {
   "title": "One More Time",
   "artist": "Daft Punk",
   "year": 2000,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/96/01/87/96018757-c750-974e-b28a-e505cf1f9780/mzaf_11687932133133164777.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/5d/7c/8e/5d7c8e84-9e75-0e06-8876-f98c13df1694/dj.mpyxowas.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/one-more-time-12-mix/697401639?i=697402071&uo=4"
  },
  {
   "title": "Lady (Hear Me Tonight)",
   "artist": "Modjo",
   "year": 2000,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/39/a0/2a/39a02a04-7e77-c309-9128-02e61098a7b7/mzaf_7220909039799435982.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/f5/25/2b/f5252b6e-0659-890b-7e9d-0e691944b95b/cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/lady-hear-me-tonight/692624255?i=692624266&uo=4"
  },
  {
   "title": "Hypnotized",
   "artist": "Purple Disco Machine & Sophie and the Giants",
   "year": 2020,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/0c/fd/f0/0cfdf0c4-6133-3a68-4d9d-9285085c01f2/mzaf_11033803523750570351.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/63/71/4f/63714f15-3882-9004-5bc1-bce533538414/20UMGIM18927.rgb.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/hypnotized/1504484137?i=1504484138&uo=4"
  }
 ],
 "hardstyle": [
  {
   "title": "Dragonborn",
   "artist": "Headhunterz",
   "year": 2012,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/d0/5d/8a/d05d8ae7-3593-4709-54db-354d024ade10/mzaf_2552424359087927505.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music4/v4/30/17/ba/3017ba61-cd03-411f-bf45-1a17cf047928/8718868387349.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/dragonborn/922000081?i=922000128&uo=4"
  },
  {
   "title": "Lose My Mind",
   "artist": "Brennan Heart & Wildstylez",
   "year": 2012,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/a4/24/da/a424da03-e542-9f1c-dd46-7af3a9650204/mzaf_10436785553959075889.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music/bc/12/1d/mzi.gtpwhgoa.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/lose-my-mind/494871314?i=494871325&uo=4"
  },
  {
   "title": "FTS",
   "artist": "Showtek",
   "year": 2007,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/1a/1a/78/1a1a78f2-67f4-b3a8-1857-31583725a46a/mzaf_15327524994892061061.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music/d0/0e/1a/mzi.sqvuksnt.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/fts/446464393?i=446464618&uo=4"
  },
  {
   "title": "Jägermeister",
   "artist": "Da Tweekaz",
   "year": 2014,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/39/5e/e2/395ee299-4ab0-032a-9318-a1b69f978692/mzaf_9732489835575518498.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/b1/19/6a/b1196a34-038c-655d-5dbd-7aef61cd2da4/5407003777697.png/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/j%C3%A4germeister/1447117599?i=1447117600&uo=4"
  },
  {
   "title": "The Project",
   "artist": "Sub Zero Project",
   "year": 2017,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/5e/06/cc/5e06cc74-4a68-dde2-9baf-62169594b0d7/mzaf_12368037519008470109.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/39/a6/4c/39a64c7f-e69f-73e7-3e1c-7ef3b5bda953/8715576191725_cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/the-project/1495967920?i=1495977356&uo=4"
  }
 ],
 "hardcore": [
  {
   "title": "Poing",
   "artist": "Rotterdam Termination Source",
   "year": 1992,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/23/b5/73/23b5737e-fb45-8fde-ffe0-7561b81899c4/mzaf_26179483405144053.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/c0/06/9d/c0069d40-195d-0c6c-c031-05923c93188f/8718522268212.png/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/poing/1477103579?i=1477103580&uo=4"
  },
  {
   "title": "Rainbow in the Sky",
   "artist": "DJ Paul Elstak",
   "year": 1995,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/57/d6/fb/57d6fb02-4fa8-f678-f8ec-f63975c48ec9/mzaf_14687750610314170513.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/2f/09/1b/2f091b38-c45a-ae57-2833-e0aa540202e2/8718522436499.png/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/rainbow-in-the-sky/1749639547?i=1749639548&uo=4"
  },
  {
   "title": "Hardcore Vibes",
   "artist": "Dune",
   "year": 1995,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/c4/14/5f/c4145fe7-9bf1-e9d0-3e3e-b4f3a4d66e97/mzaf_11655188274565496416.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e6/97/e7/e697e753-be05-14c7-a03c-0d4f86e937af/cover_0731452902320.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/hardcore-vibes/1803633856?i=1803633859&uo=4"
  },
  {
   "title": "Raise Your Fist",
   "artist": "Angerfist",
   "year": 2006,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/9a/59/25/9a592551-5e51-d852-62fc-bb18458d5238/mzaf_7820835979875298216.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music3/v4/66/cb/db/66cbdb84-11e0-aeca-19dc-0c913a8b015f/8715576156236.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/raise-your-fist/942444807?i=942444895&uo=4"
  },
  {
   "title": "Wonderful Days",
   "artist": "Charly Lownoise & Mental Theo",
   "year": 1994,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b9/9f/b8/b99fb81a-85d6-b5e2-b8bc-48e3b30a3fa7/mzaf_1732178925248881140.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/3b/e0/a4/3be0a477-1cb8-c92c-e4f3-9f115245d7d8/8718522488702.png/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/wonderful-days-radio-edit/1753098130?i=1753098134&uo=4"
  }
 ],
 "synthwave": [
  {
   "title": "Nightcall",
   "artist": "Kavinsky",
   "year": 2010,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/d2/45/fb/d245fbf9-8570-fdc0-5e6b-aa528c130486/mzaf_11947081694159530687.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/c1/2d/fe/c12dfe8f-cdf6-e179-d69a-8ec35f760266/00602537248681.rgb.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/nightcall/1442447952?i=1442447970&uo=4"
  },
  {
   "title": "A Real Hero",
   "artist": "College & Electric Youth",
   "year": 2010,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/4f/d9/00/4fd900e0-712e-1025-09ed-41af0c15550c/mzaf_15857905276201263092.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/2e/cb/c7/2ecbc706-6356-baf8-dc15-102d255b8f3c/859707985680_cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/a-real-hero/515382484?i=515382567&uo=4"
  },
  {
   "title": "Sunset",
   "artist": "The Midnight",
   "year": 2016,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/c9/ec/25/c9ec2554-c6a1-01d1-4cfb-281cf1c98f44/mzaf_5199254239611369795.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/35/8c/46/358c46cf-6a73-7345-3541-ecdf4119efc9/859717991428_cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/sunset/1758759164?i=1758759167&uo=4"
  },
  {
   "title": "Running in the Night",
   "artist": "FM-84 & Ollie Wride",
   "year": 2016,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a9/a5/61/a9a56117-e2f8-bedb-4691-4f4b666d8e12/mzaf_5875315175946443083.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/82/9a/7f/829a7f0d-7819-5e2a-7976-5a24e68450ae/872132121799_cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/running-in-the-night/1842390497?i=1842390499&uo=4"
  },
  {
   "title": "Future Club",
   "artist": "Perturbator",
   "year": 2014,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/5f/ea/cd/5feacd10-0852-98ef-6936-895674c29805/mzaf_17591071720542241537.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e4/1e/00/e41e00e2-f286-ce49-ab70-9e50d0952675/5060366780843_cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/future-club/865453558?i=865453682&uo=4"
  }
 ],
 "idm": [
  {
   "title": "Windowlicker",
   "artist": "Aphex Twin",
   "year": 1999,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/26/ad/ef/26adefa9-3d0d-c4c2-cc90-9592074831d5/mzaf_5174071142848024004.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/81/20/73/812073f2-c437-fd1d-636d-6be5a4432747/0801061910532.png/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/windowlicker/281953326?i=281953327&uo=4"
  },
  {
   "title": "Roygbiv",
   "artist": "Boards of Canada",
   "year": 1998,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/f3/e0/de/f3e0def5-52bf-f0e1-beea-523cbf8f6c1e/mzaf_15520357652152223442.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Features125/v4/b5/4c/c2/b54cc20d-03f5-f2c4-4a0d-9b51ad65af89/dj.txuslqgv.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/roygbiv/281116024?i=281116081&uo=4"
  },
  {
   "title": "Come On My Selector",
   "artist": "Squarepusher",
   "year": 1997,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/88/3b/cd/883bcd1b-f087-c6d0-190b-ccc72aada026/mzaf_16715282628378590385.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/42/78/58/42785893-554e-4f4e-11f4-27ac0c112d18/mzi.lldccrso.tif/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/come-on-my-selector/200940766?i=200942406&uo=4"
  },
  {
   "title": "Bike",
   "artist": "Autechre",
   "year": 1993,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b9/56/54/b9565461-60c8-fb26-efa5-3adb3e7c1b07/mzaf_12252263182988432713.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music/5a/dc/30/mzi.jnbtyfqc.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/bike/281042835?i=281042843&uo=4"
  },
  {
   "title": "Angel Echoes",
   "artist": "Four Tet",
   "year": 2010,
   "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview128/v4/00/20/c2/0020c2e2-c6dd-14a7-04a9-40294483f51b/mzaf_7302951272451656306.plus.aac.p.m4a",
   "art": "https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/a3/f1/79/a3f17926-28ca-c3a2-6487-77595e677376/5034202025450_cover.jpg/300x300bb.jpg",
   "url": "https://music.apple.com/us/album/angel-echoes/1286229076?i=1286229826&uo=4"
  }
 ]
};
