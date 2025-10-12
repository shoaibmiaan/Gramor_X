export type Question = {
  id: number;
  question: string;
  options: string[];
  answer: number;
};

export type SectionData = {
  duration: number;
  questions: Question[];
};

const minutes = (mins: number) => mins * 60;

export const mockSections: Record<string, SectionData> = {
  listening: {
    duration: minutes(40),
    questions: [
      {
        id: 1,
        question: 'Where is the community sustainability workshop taking place?',
        options: ['Library conference room', 'Town hall auditorium', 'Riverside sports centre', 'City museum gallery'],
        answer: 1,
      },
      {
        id: 2,
        question: 'What do participants need to bring to the workshop?',
        options: ['Identification only', 'Own reusable cup', 'Laptop and charger', 'Protective gloves'],
        answer: 2,
      },
      {
        id: 3,
        question: 'How long is the guided tour of the urban farm?',
        options: ['20 minutes', '35 minutes', '45 minutes', '60 minutes'],
        answer: 2,
      },
      {
        id: 4,
        question: 'Who will lead the session on composting?',
        options: ['Councillor Evans', 'Dr. Priya Nair', 'Chef Miguel Santos', 'Ms. Hana Suzuki'],
        answer: 1,
      },
      {
        id: 5,
        question: 'Which transport option receives a discount code?',
        options: ['Taxi share', 'Cycling', 'Park-and-ride bus', 'Tram'],
        answer: 2,
      },
      {
        id: 6,
        question: 'What time does registration open?',
        options: ['08:30', '09:00', '09:30', '10:00'],
        answer: 0,
      },
      {
        id: 7,
        question: 'How many breakout discussions are scheduled in the afternoon?',
        options: ['Two', 'Three', 'Four', 'Five'],
        answer: 1,
      },
      {
        id: 8,
        question: 'Which organisation is providing the field equipment?',
        options: ['GreenTech Labs', 'City Parks Department', 'Urban Roots NGO', 'Sustainable Homes Cooperative'],
        answer: 2,
      },
      {
        id: 9,
        question: 'What is the main topic of the keynote address?',
        options: ['Community food resilience', 'Renewable energy storage', 'Urban tree mapping', 'Low-carbon transport planning'],
        answer: 0,
      },
      {
        id: 10,
        question: 'How should attendees submit follow-up questions after the event?',
        options: ['Call the hotline', 'Post on social media', 'Email the facilitators', 'Complete a paper form'],
        answer: 2,
      },
    ],
  },
  reading: {
    duration: minutes(60),
    questions: [
      {
        id: 1,
        question: 'What was the original purpose of the Cheonggyecheon restoration?',
        options: [
          'Create new residential towers',
          'Address flooding and revitalise the city centre',
          'Build a major motorway',
          'Expand the port facilities',
        ],
        answer: 1,
      },
      {
        id: 2,
        question: 'Which city is highlighted for converting a disused river channel into a park?',
        options: ['Los Angeles', 'Jakarta', 'Lisbon', 'Cape Town'],
        answer: 0,
      },
      {
        id: 3,
        question: 'Why are hybrid office designs becoming common?',
        options: [
          'Most teams are returning to five days on-site',
          'Employees value a mix of remote and collaborative work',
          'Office leases are becoming cheaper',
          'Executives prefer traditional desk layouts',
        ],
        answer: 1,
      },
      {
        id: 4,
        question: 'What feature is frequently added to modern offices to support focus work?',
        options: ['Larger cafeterias', 'Personal lockers', 'Acoustic pods', 'Printing stations'],
        answer: 2,
      },
      {
        id: 5,
        question: 'According to researchers, what is a key consequence of teenage sleep deprivation?',
        options: [
          'Improved athletic ability',
          'Higher exam performance',
          'Greater accident risk',
          'Reduced social media use',
        ],
        answer: 2,
      },
      {
        id: 6,
        question: 'What change have some schools introduced to improve student wellbeing?',
        options: ['Weekend catch-up classes', 'Later start times', 'Shorter lunch breaks', 'Longer homework assignments'],
        answer: 1,
      },
      {
        id: 7,
        question: 'What is one challenge companies face with hybrid schedules?',
        options: ['Keeping offices open', 'Coordinating team availability', 'Replacing digital tools', 'Reducing travel budgets'],
        answer: 1,
      },
      {
        id: 8,
        question: 'Which environmental benefit is mentioned for restored urban rivers?',
        options: [
          'Guaranteed elimination of flooding',
          'Lower surrounding air temperatures',
          'Creation of new highways',
          'Permanent removal of wildlife',
        ],
        answer: 1,
      },
      {
        id: 9,
        question: 'What do surveys reveal about knowledge workers?',
        options: [
          'They prefer individual offices',
          'They want entirely remote work',
          'They support hybrid arrangements',
          'They feel meetings are unnecessary',
        ],
        answer: 2,
      },
      {
        id: 10,
        question: 'What logistical issue arises when schools delay start times?',
        options: ['Higher tuition fees', 'Transport coordination for families', 'Loss of extracurricular programs', 'Reduced teacher salaries'],
        answer: 1,
      },
    ],
  },
  writing: {
    duration: minutes(60),
    questions: [
      {
        id: 1,
        question: 'What is the minimum word count for Task 1 in the Academic test?',
        options: ['120 words', '150 words', '200 words', '250 words'],
        answer: 1,
      },
      {
        id: 2,
        question: 'Which paragraph should contain your thesis statement in Task 2?',
        options: ['Introduction', 'First body paragraph', 'Second body paragraph', 'Conclusion'],
        answer: 0,
      },
      {
        id: 3,
        question: 'When describing data in Task 1, you should primarily focus on:',
        options: ['Every minor fluctuation', 'Key trends and comparisons', 'Personal opinions', 'Future predictions only'],
        answer: 1,
      },
      {
        id: 4,
        question: 'What is the recommended approach to presenting both views in a discussion essay?',
        options: [
          'Mention one view briefly in the conclusion',
          'Describe both views with supporting examples before giving your opinion',
          'Ignore the view you disagree with',
          'Present your view only in the introduction',
        ],
        answer: 1,
      },
      {
        id: 5,
        question: 'Which criterion assesses vocabulary variety and precision?',
        options: ['Task Achievement', 'Lexical Resource', 'Coherence and Cohesion', 'Grammatical Range and Accuracy'],
        answer: 1,
      },
      {
        id: 6,
        question: 'What planning time is typically advised before writing Task 2?',
        options: ['No planning needed', 'About 5 minutes', '15 minutes', '25 minutes'],
        answer: 1,
      },
      {
        id: 7,
        question: 'Which structure best supports a balanced opinion essay?',
        options: [
          'Introduction, one long paragraph, conclusion',
          'Introduction, two body paragraphs with different views, conclusion',
          'Introduction only',
          'Five separate conclusion paragraphs',
        ],
        answer: 1,
      },
      {
        id: 8,
        question: 'What should each overview paragraph in Task 1 highlight?',
        options: [
          'Detailed statistics for every category',
          'General patterns without specific data',
          'Irrelevant background stories',
          'Exact quotations from the task prompt',
        ],
        answer: 1,
      },
      {
        id: 9,
        question: 'How can you improve cohesion within paragraphs?',
        options: ['Using random synonyms', 'Adding linking devices and clear topic sentences', 'Repeating the same idea', 'Avoiding transitions'],
        answer: 1,
      },
      {
        id: 10,
        question: 'What is an effective way to review your Task 2 essay in the final minutes?',
        options: ['Count every word', 'Rewrite the introduction', 'Check grammar and key vocabulary errors', 'Add new arguments'],
        answer: 2,
      },
    ],
  },
  speaking: {
    duration: minutes(15),
    questions: [
      {
        id: 1,
        question: 'How long does the examiner usually spend on Part 1 questions?',
        options: ['About 2 minutes', 'About 4 minutes', 'About 6 minutes', 'About 10 minutes'],
        answer: 1,
      },
      {
        id: 2,
        question: 'What is the preparation time for the Part 2 cue card?',
        options: ['30 seconds', '45 seconds', '60 seconds', '90 seconds'],
        answer: 2,
      },
      {
        id: 3,
        question: 'Which strategy helps extend answers in Part 1?',
        options: ['Give only yes/no replies', 'Add brief reasons or examples', 'Ask the examiner questions', 'Recite memorised essays'],
        answer: 1,
      },
      {
        id: 4,
        question: 'What should you do if you do not understand a question?',
        options: ['Stay silent', 'Ask for clarification politely', 'Guess quickly', 'Change the topic'],
        answer: 1,
      },
      {
        id: 5,
        question: 'Which criterion rewards natural intonation and rhythm?',
        options: ['Lexical Resource', 'Pronunciation', 'Grammatical Range', 'Task Response'],
        answer: 1,
      },
      {
        id: 6,
        question: 'How can you organise your Part 2 talk effectively?',
        options: [
          'Read the cue card aloud verbatim',
          'Follow the bullet points and add a conclusion',
          'Describe unrelated stories',
          'Focus on listing vocabulary words',
        ],
        answer: 1,
      },
      {
        id: 7,
        question: 'What is the examiner looking for in Part 3 responses?',
        options: [
          'Short personal anecdotes only',
          'Developed ideas with explanation and examples',
          'Memorised definitions',
          'Statistics from books',
        ],
        answer: 1,
      },
      {
        id: 8,
        question: 'How can you demonstrate lexical resource during the interview?',
        options: [
          'Repeating the same adjectives',
          'Using topic-specific vocabulary naturally',
          'Speaking as quickly as possible',
          'Avoiding idiomatic language entirely',
        ],
        answer: 1,
      },
      {
        id: 9,
        question: 'What should you focus on when practising pronunciation?',
        options: ['Perfect imitation of a native accent', 'Clarity, stress, and connected speech', 'Learning unusual vocabulary', 'Speaking quietly'],
        answer: 1,
      },
      {
        id: 10,
        question: 'Why is it helpful to reflect on your performance after a mock speaking test?',
        options: ['To memorise the examiner’s script', 'To identify strengths and areas to improve', 'To shorten future answers', 'To avoid practising again'],
        answer: 1,
      },
    ],
  },
};
