export interface CalibrationRubric {
  TR: string;
  CC: string;
  LR: string;
  GRA: string;
}

export interface CalibrationAnchor {
  id: string;
  taskType: 'task1' | 'task2';
  prompt: string;
  band: number;
  essay: string;
  rubric: CalibrationRubric;
}

const calibration: CalibrationAnchor[] = [
  {
    id: 'anchor-task2-transit',
    taskType: 'task2',
    prompt:
      'Governments should invest more in public transport than in building new roads. To what extent do you agree or disagree?',
    band: 8,
    essay: `It is often argued that city budgets should favour public transport rather than highways. This essay strongly agrees because rail and bus networks move more people efficiently and protect the environment.

To begin with, metros and bus rapid transit use scarce urban land much more effectively than private vehicles. For example, a single metro line in Seoul carries almost half a million passengers daily on tracks that occupy less than 5% of the road space required by the same number of cars. Such systems also provide predictable travel times, which encourages commuters to leave their cars at home.

Furthermore, cleaner transport infrastructure meaningfully reduces pollution. London's investment in hybrid buses alongside congestion charging lowered nitrogen dioxide levels by 12% in 5 years. This demonstrates that switching budgets towards mass transit not only improves public health but also helps cities meet their climate commitments.

In conclusion, public transport deserves a larger share of infrastructure funding because it eases congestion and protects the environment. Governments that continue to prioritise new roads will lock in higher emissions and traffic for decades.`,
    rubric: {
      TR: 'Addresses all parts with a clear opinion and strong justification.',
      CC: 'Paragraphing is logical with effective cohesion.',
      LR: 'Uses a wide range of topic-specific vocabulary naturally.',
      GRA: 'Displays flexibility with complex sentences and minimal errors.',
    },
  },
  {
    id: 'anchor-task2-screen-time',
    taskType: 'task2',
    prompt:
      'Some people think parents should strictly limit screen time for children, while others believe screens can be educational. Discuss both views and give your opinion.',
    band: 6.5,
    essay: `Many parents today are unsure how much screen time their children should have. This essay will discuss both sides of the argument and explain why a balanced approach is best.

On the one hand, there are good reasons for limiting screens. Young children who watch too much television often miss out on exercise, and research from the American Academy of Pediatrics links very high screen use with sleep problems. Without rules, children might spend the whole evening online instead of doing homework.

On the other hand, screens can be educational when adults supervise content. For instance, during the pandemic many classes moved online, and interactive maths apps helped keep lessons interesting. Families separated across countries also rely on video calls to maintain relationships, which is emotionally important for children.

In my view, parents should set clear boundaries but not ban screens completely. A good compromise is to schedule limited daily screen time that focuses on educational or creative programmes while keeping time for outdoor play.

In conclusion, strict limits are necessary to protect health, yet screens also provide valuable learning opportunities when used carefully.`,
    rubric: {
      TR: 'Covers both views and presents an opinion but lacks depth in some arguments.',
      CC: 'Generally coherent though transitions could be more varied.',
      LR: 'Vocabulary is adequate with some repetition.',
      GRA: 'Mostly accurate grammar with occasional errors in complex sentences.',
    },
  },
];

export default calibration;
