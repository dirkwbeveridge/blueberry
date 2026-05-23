export interface BabyDevelopment {
  week:       number;
  size_fruit: string;
  size_cm:    number;
  weight_g:   number;
  headline:   string;
  partner_note: string;
}

export const babyDevelopment: BabyDevelopment[] = [
  { week: 1,  size_fruit: 'poppy seed',    size_cm: 0.1,  weight_g: 0,    headline: 'Fertilisation occurs — your baby\'s DNA is complete.',                              partner_note: 'A remarkable journey begins, invisibly.' },
  { week: 2,  size_fruit: 'sesame seed',   size_cm: 0.2,  weight_g: 0,    headline: 'The blastocyst implants into the uterine lining.',                                  partner_note: 'She may not know yet — be patient and calm.' },
  { week: 3,  size_fruit: 'lentil',        size_cm: 0.3,  weight_g: 0,    headline: 'hCG hormone begins — a test may turn positive any day.',                            partner_note: 'A positive test may be hours away.' },
  { week: 4,  size_fruit: 'poppy seed',    size_cm: 0.4,  weight_g: 0,    headline: 'The neural tube and heart foundations are forming.',                                 partner_note: 'Start folic acid now if not already.' },
  { week: 5,  size_fruit: 'apple seed',    size_cm: 0.5,  weight_g: 0,    headline: 'The heart begins to beat — about 100 times per minute.',                            partner_note: 'Morning sickness may be starting — be patient.' },
  { week: 6,  size_fruit: 'sweet pea',     size_cm: 0.6,  weight_g: 0,    headline: 'Arm and leg buds appear. The brain is growing fast.',                               partner_note: 'Take over cooking — smells are brutal right now.' },
  { week: 7,  size_fruit: 'blueberry',     size_cm: 1.0,  weight_g: 0,    headline: 'The size of a blueberry — your app\'s namesake.',                                   partner_note: 'Be unconditionally present this week.' },
  { week: 8,  size_fruit: 'kidney bean',   size_cm: 1.6,  weight_g: 1,    headline: 'Fingers and toes are forming. The face looks more human.',                          partner_note: 'Attend the first prenatal appointment if possible.' },
  { week: 9,  size_fruit: 'grape',         size_cm: 2.3,  weight_g: 2,    headline: 'Now officially a foetus. All essential organs are in place.',                        partner_note: 'Ask how she\'s feeling emotionally, not just physically.' },
  { week: 10, size_fruit: 'kumquat',       size_cm: 3.1,  weight_g: 4,    headline: 'Fingernails are forming. The foetus can yawn and swallow.',                          partner_note: 'Acknowledge how hard the first trimester has been.' },
  { week: 11, size_fruit: 'fig',           size_cm: 4.1,  weight_g: 7,    headline: 'Eyes move toward the front of the face. Bones begin hardening.',                    partner_note: 'She may be weepy — it\'s hormonal and will ease.' },
  { week: 12, size_fruit: 'lime',          size_cm: 5.4,  weight_g: 14,   headline: 'Reflexes are developing — palm touch makes fingers curl.',                           partner_note: 'The 12-week scan is nerve-wracking. Be calm and steady.' },
  { week: 13, size_fruit: 'peach',         size_cm: 7.4,  weight_g: 23,   headline: 'First trimester complete. Miscarriage risk drops significantly.',                    partner_note: 'Celebrate 13 weeks — it\'s a real milestone.' },
  { week: 14, size_fruit: 'lemon',         size_cm: 8.7,  weight_g: 43,   headline: 'Facial expressions appear — squinting, frowning, grimacing.',                        partner_note: 'Tell her she looks beautiful. Mean it.' },
  { week: 15, size_fruit: 'apple',         size_cm: 10.1, weight_g: 70,   headline: 'Taste buds forming — baby tastes whatever mum eats.',                               partner_note: 'She may start showing — celebrate the visible change.' },
  { week: 16, size_fruit: 'avocado',       size_cm: 11.6, weight_g: 100,  headline: 'Eyebrows and lashes are forming. Baby can make a fist.',                             partner_note: 'She may feel the first flutters — ask about them.' },
  { week: 17, size_fruit: 'pear',          size_cm: 13.0, weight_g: 140,  headline: 'Fat stores begin forming. Fingerprints are unique and set.',                         partner_note: 'Offer a gentle back massage — her posture is shifting.' },
  { week: 18, size_fruit: 'bell pepper',   size_cm: 14.2, weight_g: 190,  headline: 'Baby can hear voices — yours included. Speak to the bump.',                          partner_note: 'Talk to the bump. Baby can hear you now.' },
  { week: 19, size_fruit: 'heirloom tomato', size_cm: 15.3, weight_g: 240, headline: 'A waxy coating called vernix forms to protect the skin.',                           partner_note: 'The anatomy scan is coming — go together.' },
  { week: 20, size_fruit: 'banana',        size_cm: 16.4, weight_g: 300,  headline: 'Halfway there. Baby is moving regularly and noticeably.',                             partner_note: 'Halfway. Take a photo of the bump tonight.' },
  { week: 21, size_fruit: 'carrot',        size_cm: 26.7, weight_g: 360,  headline: 'Baby is swallowing amniotic fluid and practicing digestion.',                        partner_note: 'Kicks will become a daily ritual — participate.' },
  { week: 22, size_fruit: 'papaya',        size_cm: 27.8, weight_g: 430,  headline: 'Eyelids and lips are distinct. Tooth buds form under the gums.',                     partner_note: 'Research prenatal classes and book one together.' },
  { week: 23, size_fruit: 'grapefruit',    size_cm: 28.9, weight_g: 501,  headline: 'Baby is gaining weight rapidly and movements are strong.',                           partner_note: 'Ask her what she\'s feeling about birth. Listen more than you talk.' },
  { week: 24, size_fruit: 'ear of corn',   size_cm: 30.0, weight_g: 600,  headline: 'Lungs begin producing surfactant, preparing for first breath.',                      partner_note: 'The third trimester is weeks away — keep the energy up.' },
  { week: 25, size_fruit: 'cauliflower',   size_cm: 34.6, weight_g: 660,  headline: 'Baby responds to touch from outside the belly.',                                     partner_note: 'Place your hand on the bump and stay patient.' },
  { week: 26, size_fruit: 'scallion bunch', size_cm: 35.6, weight_g: 760, headline: 'Eyes can open and close. Baby blinks in response to light.',                          partner_note: 'Second trimester ends next week — celebrate how far you\'ve come.' },
  { week: 27, size_fruit: 'rutabaga',      size_cm: 36.6, weight_g: 875,  headline: 'Third trimester begins. Brain activity increases dramatically.',                      partner_note: 'Third trimester. Her comfort becomes your primary job.' },
  { week: 28, size_fruit: 'eggplant',      size_cm: 37.6, weight_g: 1005, headline: 'Baby can dream. REM sleep cycles are established.',                                  partner_note: 'Start thinking about the hospital bag — not yet, but soon.' },
  { week: 29, size_fruit: 'butternut squash', size_cm: 38.6, weight_g: 1153, headline: 'Baby\'s bones are hardening and absorbing calcium rapidly.',                      partner_note: 'Take over all physically demanding tasks without being asked.' },
  { week: 30, size_fruit: 'cabbage',       size_cm: 39.9, weight_g: 1319, headline: 'Baby is practising breathing movements, preparing for birth.',                       partner_note: 'Ask about her birth plan — listen with an open mind.' },
  { week: 31, size_fruit: 'coconut',       size_cm: 41.1, weight_g: 1502, headline: 'All five senses are functioning. Baby is very active.',                               partner_note: 'She may be struggling to sleep — make the bedroom as comfortable as possible.' },
  { week: 32, size_fruit: 'squash',        size_cm: 42.4, weight_g: 1702, headline: 'Baby is likely head-down, preparing for birth.',                                      partner_note: 'Keep your phone charged. She may need you quickly.' },
  { week: 33, size_fruit: 'pineapple',     size_cm: 43.7, weight_g: 1918, headline: 'Brain and nervous system are nearly complete.',                                       partner_note: 'Pack the hospital bag together this week.' },
  { week: 34, size_fruit: 'cantaloupe',    size_cm: 45.0, weight_g: 2146, headline: 'Lungs are nearly mature. Baby has a strong sucking reflex.',                          partner_note: 'Install the car seat and get it inspected.' },
  { week: 35, size_fruit: 'honeydew melon', size_cm: 46.2, weight_g: 2383, headline: 'Baby is putting on about 14g per day in fat stores.',                                partner_note: 'Prepare freezer meals for after the birth.' },
  { week: 36, size_fruit: 'romaine lettuce', size_cm: 47.4, weight_g: 2622, headline: 'Baby is considered early term. Most organs are ready.',                             partner_note: 'Be ready — labour could come any time from here.' },
  { week: 37, size_fruit: 'winter melon',  size_cm: 48.6, weight_g: 2859, headline: 'Baby is full term. The head may engage in the pelvis.',                               partner_note: 'Ask what she wants from you in the delivery room.' },
  { week: 38, size_fruit: 'small watermelon', size_cm: 49.8, weight_g: 3083, headline: 'Baby\'s grasp is strong enough to hold your finger.',                             partner_note: 'Clear your schedule as much as possible.' },
  { week: 39, size_fruit: 'small pumpkin', size_cm: 50.7, weight_g: 3288, headline: 'Baby is fully developed and ready to meet you.',                                     partner_note: 'Stay close. She may need you at any moment.' },
  { week: 40, size_fruit: 'mini watermelon', size_cm: 51.2, weight_g: 3462, headline: 'Due date week. Baby could arrive any day.',                                         partner_note: 'Hold her hand. Be completely present.' },
];
