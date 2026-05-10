-- Verba — seed data for testing
-- Apply AFTER 0001_initial_schema.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- Decks
-- ─────────────────────────────────────────────────────────────────────────────
insert into decks (slug, name, description, color_family, total_words) values
  ('essential', 'Essential English',  'Words you need to know',                'blue',  1000),
  ('advanced',  'Advanced English',   'Read newspapers and books fluently',    'blue',  1000),
  ('gre',       'GRE Vocabulary',     'Advanced words for the GRE exam',       'mauve', 800),
  ('myverba',   'My Verba',           'Words you have saved or added',         'amber', 0)
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Words — Essential English
-- ─────────────────────────────────────────────────────────────────────────────
insert into words (deck_slug, word, difficulty, frequency_rank, italian_translation, synonyms, antonyms, distractors, source) values
  ('essential', 'run',    'medium',  12, 'correre',
    array['jog','sprint','dash'],
    array['walk','stop'],
    array['swim','sing','crawl'],
    'NGSL'),
  ('essential', 'light',  'medium',  45, 'luce',
    array['glow','radiance','illumination'],
    array['darkness','shadow'],
    array['sound','weight','motion'],
    'NGSL'),
  ('essential', 'study',  'medium',  78, 'studiare',
    array['learn','review','examine'],
    array['ignore'],
    array['cook','dance','sleep'],
    'NGSL'),
  ('essential', 'simple', 'medium', 110, 'semplice',
    array['easy','plain','basic'],
    array['complex','difficult'],
    array['heavy','sour','sharp'],
    'NGSL'),
  ('essential', 'try',    'medium',  62, 'provare',
    array['attempt','endeavour'],
    array['quit','give up'],
    array['forget','arrive','listen'],
    'NGSL')
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Words — Advanced English
-- ─────────────────────────────────────────────────────────────────────────────
insert into words (deck_slug, word, difficulty, frequency_rank, italian_translation, synonyms, antonyms, distractors, source) values
  ('advanced', 'resilience',  'medium', 2300, 'resilienza',
    array['toughness','endurance','elasticity'],
    array['fragility','weakness'],
    array['fluency','curiosity','silence'],
    'COCA-Advanced'),
  ('advanced', 'contemplate', 'medium', 2750, 'contemplare',
    array['ponder','consider','muse'],
    array['ignore','dismiss'],
    array['shout','demolish','sprint'],
    'COCA-Advanced'),
  ('advanced', 'ambivalent',  'medium', 3120, 'ambivalente',
    array['conflicted','undecided','torn'],
    array['certain','resolute'],
    array['fragrant','melodic','vivid'],
    'COCA-Advanced'),
  ('advanced', 'profound',    'medium', 1980, 'profondo',
    array['deep','intense','meaningful'],
    array['shallow','trivial'],
    array['quick','noisy','sticky'],
    'COCA-Advanced'),
  ('advanced', 'mitigate',    'medium', 2660, 'mitigare',
    array['ease','alleviate','soften'],
    array['aggravate','worsen'],
    array['inflate','disclose','animate'],
    'COCA-Advanced')
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Words — GRE
-- ─────────────────────────────────────────────────────────────────────────────
insert into words (deck_slug, word, difficulty, frequency_rank, italian_translation, synonyms, antonyms, distractors, source) values
  ('gre', 'ephemeral', 'medium', 5800, 'effimero',
    array['fleeting','transient','momentary'],
    array['permanent','enduring'],
    array['enormous','frigid','coarse'],
    'GregMat-Group1'),
  ('gre', 'luminous',  'medium', 5210, 'luminoso',
    array['radiant','glowing','brilliant'],
    array['dim','dark'],
    array['bitter','hollow','silent'],
    'GregMat-Group1'),
  ('gre', 'cogent',    'medium', 6440, 'convincente',
    array['compelling','persuasive','convincing'],
    array['weak','unconvincing'],
    array['frantic','dormant','sparse'],
    'GregMat-Group1'),
  ('gre', 'querulous', 'medium', 7120, 'lamentoso',
    array['whining','peevish','complaining'],
    array['cheerful','content'],
    array['loyal','jagged','noble'],
    'GregMat-Group2'),
  ('gre', 'sanguine',  'medium', 6890, 'ottimista',
    array['optimistic','hopeful','confident'],
    array['pessimistic','gloomy'],
    array['hollow','rigid','tepid'],
    'GregMat-Group2')
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Definitions
-- Use subselects keyed on (deck_slug, word) since (deck_slug, word) is unique
-- within our seed.
-- ─────────────────────────────────────────────────────────────────────────────

-- Essential
insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'verb', 'To move swiftly on foot.', 'She likes to run every morning.', 0
from words where deck_slug='essential' and word='run';

insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'noun', 'The natural agent that makes things visible.', 'Light streamed through the window.', 0
from words where deck_slug='essential' and word='light';

insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'verb', 'To devote time and attention to learning.', 'I study English every day.', 0
from words where deck_slug='essential' and word='study';

insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'adjective', 'Easy to understand or do.', 'It is a simple recipe.', 0
from words where deck_slug='essential' and word='simple';

insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'verb', 'To make an attempt or effort.', 'I will try to call him later.', 0
from words where deck_slug='essential' and word='try';

-- Advanced
insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'noun', 'The ability to recover quickly from difficulty.', 'Her resilience after the loss inspired everyone.', 0
from words where deck_slug='advanced' and word='resilience';

insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'verb', 'To think deeply and at length.', 'He sat by the lake to contemplate his future.', 0
from words where deck_slug='advanced' and word='contemplate';

insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'adjective', 'Having mixed feelings about someone or something.', 'She felt ambivalent about moving abroad.', 0
from words where deck_slug='advanced' and word='ambivalent';

insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'adjective', 'Very great or intense; deeply felt.', 'The book had a profound impact on me.', 0
from words where deck_slug='advanced' and word='profound';

insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'verb', 'To make less severe or painful.', 'These steps will mitigate the damage.', 0
from words where deck_slug='advanced' and word='mitigate';

-- GRE — single-def words
insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'adjective', 'Lasting for a very short time.', 'Fame can be ephemeral.', 0
from words where deck_slug='gre' and word='ephemeral';

insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'adjective', 'Giving off light; bright or shining.', 'The luminous moon lit the path.', 0
from words where deck_slug='gre' and word='luminous';

insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'adjective', 'Clear, logical, and convincing.', 'She presented a cogent argument.', 0
from words where deck_slug='gre' and word='cogent';

insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'adjective', 'Complaining in a petulant or whining manner.', 'The querulous child refused to nap.', 0
from words where deck_slug='gre' and word='querulous';

-- GRE — sanguine: multi-def to test multi-definition support
insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'adjective', 'Optimistic or positive, especially in a difficult situation.', 'He remained sanguine about the project despite delays.', 0
from words where deck_slug='gre' and word='sanguine';

insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'adjective', 'Of a healthy reddish colour; ruddy.', 'Her sanguine complexion suggested good health.', 1
from words where deck_slug='gre' and word='sanguine';

insert into word_definitions (word_id, part_of_speech, definition, example, display_order)
select id, 'noun', 'A blood-red colour (heraldic).', 'The shield was tinted in sanguine.', 2
from words where deck_slug='gre' and word='sanguine';
