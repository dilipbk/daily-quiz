# Content taxonomy

| | |
|---|---|
| **Status** | Draft for the owner's approval (CT-01) |
| **Date** | 2026-11-21 |
| **Maintained by** | PM / PO |
| **Serves** | Spec §11.1 (Taxonomy), §11.4, L10N-06, DLY-01, ONB-01 |

Every question is filed under one domain and one topic. Players pick domains as their interests at first launch (ONB-01), the Daily 5 draws from them, ratings are kept per domain (spec §11.5), and each Global Daily must span five (DLY-01). A question filed in the wrong place is a question served to the wrong player.

Rule IDs (`TX-01`) are stable. Cite one when you move or reject a question.

## 1. Filing rules

| ID | Rule |
|---|---|
| TX-01 | A question has exactly one domain and one topic, both from the lists below. |
| TX-02 | File by what a player must know to answer, not by where the question is set. "Which gas makes bread rise?" is food science. "What is the chemical symbol for sodium?" is chemistry, even inside a question about salt. |
| TX-03 | Use the interest test when two domains fit: a player who picked this domain as an interest should not be surprised to meet this question. |
| TX-04 | The history of a field belongs to the field: the first Olympic Games are Sports, the discovery of penicillin is Science, the Impressionists are Arts & Literature. History holds political, social, military and economic history, and everyday life in the past. |
| TX-05 | A person is filed by what they are known for. |
| TX-06 | When two topics in one domain fit, choose the narrower. |
| TX-07 | Subtopics are not used at launch. The PM splits a topic into subtopics, in a change to this document, when it holds 60 published questions. |
| TX-08 | A tag is optional and comes only from the list in §4. |
| TX-09 | A question that is common knowledge in some countries and obscure elsewhere carries region tags (§5). |
| TX-10 | An id is permanent. It is never renamed or reused, because ratings and statistics are keyed to it. A display name can change. |

## 2. Domains

The eleven launch domains are those of spec §11.4. The ids are new.

| Id | Name | Holds | Does not hold |
|---|---|---|---|
| `science` | Science | How the physical world and the body work, and who found out | Animals and plants as creatures (Nature & Animals); devices and machines (Technology) |
| `math-logic` | Math & Logic | Numbers, shapes, chance, reasoning | Physics formulas (Science); code (Technology) |
| `technology` | Technology | Computing, the internet, engineering, inventions | Scientific discoveries (Science); video games as entertainment (Entertainment) |
| `food-cooking` | Food & Cooking | Ingredients, techniques, dishes, food science | Farming and wild plants (Nature & Animals); diseases (Science) |
| `history` | History | Events, rulers, wars, societies and daily life in the past | The history of one field (TX-04) |
| `geography` | Geography | Places: where they are, what they are like, who lives there | How volcanoes or weather work (Science) |
| `arts-literature` | Arts & Literature | Books, visual art, architecture, classical music, the stage, myth, ideas | Film, television and popular music (Entertainment) |
| `words-language` | Words & Language | Meanings, origins, grammar, spelling, the world's languages | Literature (Arts & Literature) |
| `nature-animals` | Nature & Animals | Animals, plants and the places they live | Cells, genes and evolution as theory (Science) |
| `sports` | Sports | Sports, competitions, athletes, rules and records | Chess and other games (Entertainment) |
| `entertainment` | Entertainment | Film, television, popular music, animation, comics, games | Classical music and theater (Arts & Literature) |

## 3. Topics

### Science (`science`)

| Id | Name | Holds |
|---|---|---|
| `physics` | Physics | Forces, energy, light, sound, electricity, the atom |
| `chemistry` | Chemistry | Elements, reactions, materials, the periodic table |
| `space` | Space | Planets, stars, the universe, space missions |
| `human-body` | Human body and health | Anatomy, senses, the brain and mind, diseases, medicine |
| `life-science` | Life science | Cells, genetics, evolution, microbes |
| `earth-science` | Earth science | Rocks, volcanoes, earthquakes, weather and climate as systems |
| `discoveries` | Discoveries and scientists | Who found what, famous experiments, units, prizes |

### Math & Logic (`math-logic`)

| Id | Name | Holds |
|---|---|---|
| `numbers` | Numbers and arithmetic | Primes, fractions, number systems, mental arithmetic |
| `algebra` | Algebra | Equations, functions, sequences with a rule |
| `geometry` | Geometry | Shapes, angles, area, volume |
| `probability-statistics` | Chance and data | Probability, averages, reading a chart |
| `logic-puzzles` | Logic and puzzles | Deduction and puzzles with one defensible answer |
| `everyday-math` | Everyday math | Percentages, money, units, time, estimation |
| `math-history` | Mathematicians and famous problems | People, constants, theorems and their stories |

### Technology (`technology`)

| Id | Name | Holds |
|---|---|---|
| `computers-devices` | Computers and devices | How computers, phones and other devices work |
| `internet` | Internet and web | Networks, the web, online services, security and privacy |
| `programming` | Programming | Code, languages, algorithms, data structures |
| `ai-data` | AI and data | Machine learning, databases, how data is stored and used |
| `engineering` | Engineering | How machines, vehicles, bridges and power systems work |
| `inventions` | Inventions | What was invented, when and by whom, in any era |
| `tech-industry` | Companies and people | Founders, products, milestones of the computing era |

### Food & Cooking (`food-cooking`)

| Id | Name | Holds |
|---|---|---|
| `ingredients` | Ingredients | Produce, grains, spices, dairy: what it is and where it comes from |
| `techniques` | Techniques and tools | Cooking methods, kitchen terms, equipment |
| `food-science` | Food science | Why cooking works: heat, fermentation, emulsions; what food contains |
| `world-cuisines` | World cuisines | Dishes and the places and cultures they come from |
| `baking-sweets` | Baking and sweets | Bread, pastry, desserts, chocolate |
| `drinks` | Drinks | Coffee, tea and other drinks. Alcohol only as the editorial guidelines allow (EG-48) |
| `food-history` | Food history and customs | Origins of foods, table customs, festivals, famous cooks |

### History (`history`)

A question is filed by the date of the event its answer turns on. Dates are written with BCE and CE.

| Id | Name | Holds |
|---|---|---|
| `ancient` | Ancient world | Before 500 CE |
| `medieval` | Medieval world | 500 to 1499 |
| `early-modern` | Early modern | 1500 to 1799 |
| `nineteenth-century` | The long nineteenth century | 1800 to 1913 |
| `world-wars` | The world wars | 1914 to 1945 |
| `since-1945` | Since 1945 | 1946 onward, subject to the guidelines' rule on recent events (EG-52) |
| `across-eras` | Across eras | Questions that span periods: timelines, firsts, long-lived states, archaeology |

### Geography (`geography`)

| Id | Name | Holds |
|---|---|---|
| `countries-capitals` | Countries and capitals | Which country, which capital, where it is |
| `physical` | Physical geography | Mountains, rivers, lakes, deserts, oceans, islands, the climate of a place |
| `maps-borders` | Maps and borders | Neighbors, shapes, coordinates, time zones, map reading |
| `cities-landmarks` | Cities and landmarks | Cities and the things people built in them |
| `flags-symbols` | Flags and symbols | Flags, emblems, anthems, currencies |
| `people-places` | People and places | Population, languages spoken, how countries are governed and earn their living, festivals |

### Arts & Literature (`arts-literature`)

| Id | Name | Holds |
|---|---|---|
| `literature` | Literature | Novels, poetry, plays as texts, authors, characters |
| `visual-art` | Visual art | Painting, sculpture, photography, artists, movements |
| `architecture-design` | Architecture and design | Buildings as design, styles, architects, fashion |
| `classical-music` | Classical music and opera | Composers, works, instruments, the orchestra |
| `theater-dance` | Theater and dance | The stage: plays in performance, musicals, ballet |
| `mythology-folklore` | Mythology and folklore | Myths, legends, fairy tales, folk belief |
| `philosophy-beliefs` | Philosophy and beliefs | Philosophers, schools of thought, the world's religions described neutrally (EG-46) |

### Words & Language (`words-language`)

| Id | Name | Holds |
|---|---|---|
| `vocabulary` | Vocabulary | Meanings, synonyms, opposites |
| `word-origins` | Word origins | Etymology, loanwords, words named after people |
| `grammar-usage` | Grammar and usage | Parts of speech, punctuation, commonly confused words |
| `spelling` | Spelling | Which spelling is right |
| `idioms-sayings` | Idioms and sayings | Idioms, proverbs, where a phrase comes from |
| `world-languages` | World languages | Languages, language families, alphabets and scripts, words in other languages |
| `wordplay` | Wordplay | Anagrams, palindromes, rhymes, hidden words |

### Nature & Animals (`nature-animals`)

An animal is filed by its class first: a whale is a mammal, a penguin is a bird.

| Id | Name | Holds |
|---|---|---|
| `mammals` | Mammals | Land and sea mammals, pets and farm animals included |
| `birds` | Birds | |
| `fish-sea-life` | Fish and sea life | Fish, sharks, corals, octopuses and other sea life that is neither mammal nor bird |
| `reptiles-amphibians` | Reptiles and amphibians | |
| `insects-bugs` | Insects and other small creatures | Insects, spiders and other land invertebrates |
| `plants-fungi` | Plants and fungi | Trees, flowers, crops as plants, mushrooms |
| `habitats-conservation` | Habitats and conservation | Ecosystems, food chains, endangered species, behavior across groups |
| `prehistoric-life` | Prehistoric life | Dinosaurs, fossils, extinct animals |

### Sports (`sports`)

| Id | Name | Holds |
|---|---|---|
| `football` | Football (soccer) | Association football only |
| `team-sports` | Other team sports | Basketball, cricket, rugby, baseball, American football, ice hockey, volleyball and others |
| `racket-sports-golf` | Racket sports and golf | Tennis, badminton, table tennis, squash, golf |
| `olympics-athletics` | Olympics and athletics | The Olympic and Paralympic Games, track and field, swimming, gymnastics |
| `motorsport-cycling` | Motorsport and cycling | Racing on wheels |
| `combat-sports` | Combat sports | Boxing, martial arts, wrestling, fencing |
| `winter-water-outdoor` | Winter, water and outdoor sports | Skiing, skating, sailing, surfing, climbing |
| `across-sports` | Across sports | Rules, terms and records that compare sports |

### Entertainment (`entertainment`)

| Id | Name | Holds |
|---|---|---|
| `film` | Film | Films, directors, actors, characters, film music |
| `television` | Television | Series, streaming, presenters |
| `popular-music` | Popular music | Rock, pop, hip-hop, jazz and the rest of recorded popular music |
| `animation-comics` | Animation and comics | Animated film and series, anime, comics, manga |
| `games` | Games | Video games, board and card games, chess, toys |
| `awards-industry` | Awards and the industry | Awards, box office, studios, how film, television and music are made |

## 4. Tags

A question needs no tag. A tag marks a theme that cuts across domains, so that a collection or a themed season (BDG-02, V1) can gather it. The list starts short and grows when a collection needs a new one; the PM adds it here first.

`space` · `oceans` · `climate` · `inventions` · `nobel-prize` · `olympics` · `world-cup` · `ancient-egypt` · `ancient-greece-rome` · `renaissance` · `world-war-ii` · `festivals-holidays`

## 5. Region tags

`regionTags` lists the countries where a question is common knowledge, as ISO 3166-1 two-letter codes (`US`, `GB`, `IN`). An empty list means the question is fair anywhere, and that is the default.

| ID | Rule |
|---|---|
| TX-11 | Tag a question when a well-read adult on another continent would have no fair chance at it: a national league's teams, a country's television, its school curriculum, its holidays, its domestic politics. |
| TX-12 | Don't tag a question merely because it is about a country. "What is the capital of Japan?" is fair anywhere. |
| TX-13 | A region-tagged question never goes into a Global Daily, which is the same set everywhere (DLY-02). |
| TX-14 | Until personalization uses the tags (L10N-06, V1), a region-tagged question appears only in a quiz whose title makes the region plain. |
| TX-15 | At most one question in ten of the launch bank is region-tagged (a PM target). |

## 6. Where common cases go

| The question is about | File under | Rule |
|---|---|---|
| Why onions make you cry; why bread rises | `food-cooking` / `food-science` | TX-02 |
| How a volcano erupts | `science` / `earth-science` | TX-02 |
| Where a volcano is | `geography` / `physical` | TX-02 |
| The Apollo missions | `science` / `space` | TX-03 |
| Who invented the telephone | `technology` / `inventions` | TX-04 |
| A battle or a treaty | `history`, by its date | |
| The history of the World Cup | `sports` / `football` | TX-04 |
| A novel's author | `arts-literature` / `literature` | TX-02 |
| The director of the film of that novel | `entertainment` / `film` | TX-02 |
| A film's score and its composer | `entertainment` / `film` | TX-05 |
| A symphony and its composer | `arts-literature` / `classical-music` | |
| The official language of a country | `geography` / `people-places` | TX-02 |
| The language family of Hungarian | `words-language` / `world-languages` | TX-02 |
| Where the word "sandwich" comes from | `words-language` / `word-origins` | TX-02 |
| Greek gods | `arts-literature` / `mythology-folklore` | |
| A living religion's texts, festivals or practices | `arts-literature` / `philosophy-beliefs` | EG-46 |
| Dinosaurs | `nature-animals` / `prehistoric-life` | |
| Human evolution | `science` / `life-science` | |
| Vitamins in food | `food-cooking` / `food-science` | TX-02 |
| What a vitamin does in the body | `science` / `human-body` | TX-02 |
| A country's currency | `geography` / `flags-symbols` | |
| How inflation or a parliament works | `geography` / `people-places` | See §8 |
| Chess | `entertainment` / `games` | |
| A car maker or a model | `technology` / `engineering` | |
| Astrology | `arts-literature` / `mythology-folklore`, as folk belief, never as fact | |

## 7. Launch coverage

Launch needs at least 3,000 reviewed questions across the eleven domains (spec §11.6). These are PM targets within that number.

| Target | Value | Why |
|---|---|---|
| Per domain | At least 200; aim for 270 | An even spread, so no interest runs dry |
| Per topic | At least 20 | A Daily 5 must not repeat a question within 30 days (BE-18) |
| Easy questions per domain | At least 60 | The first quiz is 5 easy questions from the player's interests (ONB-01) |
| Usable in a Global Daily | At least 600 across all domains | 60 days of 8 questions, with room to choose (EG-63 to EG-66) |

## 8. Open points

- **No domain holds economics, business, law or civics.** They are filed under `geography` / `people-places` for now. A twelfth domain would be a design change (a category color and an illustration), so it is the owner's call.
- **Games sit in Entertainment**, though spec §11.4 glosses that domain as "film, TV, music".
- **The topic lists are a first cut.** Expect to merge or split topics once the first 300 questions show where content gathers. A topic with content keeps its id (TX-10).

## 9. Changing this document

The PM changes the taxonomy in a pull request, and the owner approves a new or removed domain. CT-02 turns these tables into the data file that `content:validate` reads. From then on a change lands in both in the same pull request.
