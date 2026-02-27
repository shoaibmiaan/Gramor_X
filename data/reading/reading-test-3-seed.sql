do $$
declare
  v_test_id uuid;
  v_p1_id uuid;
  v_p2_id uuid;
  v_p3_id uuid;
begin

  insert into public.reading_tests (
    slug, title, exam_type, description,
    difficulty_band_min, difficulty_band_max,
    total_questions, total_passages, duration_seconds,
    is_active, source, tags, difficulty, question_count
  ) values (
    'reading-test-3',
    'Reading Practice Test 8 — Digital Archives',
    'academic',
    NULL,
    NULL,
    NULL,
    40,
    3,
    3600,
    true,
    'GX seed',
    array['seed','v1'],
    'hard',
    40
  ) returning id into v_test_id;

  insert into public.reading_passages (
    test_id, passage_order, title, content
  ) values (
    v_test_id, 1, 'Digitising Northborough''s Archives',
    $gx_p1$The Northborough Museum cares for more than two million objects, but until recently barely five percent had any digital record. When a flood warning in 2019 threatened its riverside storage wing, curators realised they needed a faster method to document fragile manuscripts. They approached the Civic Makers Collective, a local group of photographers and technologists, who designed portable scanning stations that could be assembled inside the museum's reading rooms. Each rig combines a lightweight camera cradle with custom software that logs the object's accession number and condition in a single workflow.

Volunteers were recruited from the city's adult education college and trained in basic conservation handling. Before they scan a manuscript, pairs of volunteers brush away dust, record existing tears, and add metadata about the author. A quality-control coordinator reviews images each evening and flags any pages needing to be rescanned. The museum also collaborates with linguistics students to transcribe marginal notes written in dialects that would otherwise be hard to search. Funding from a regional innovation grant paid for heat sensors that monitor the temporary scanning spaces, ensuring that light levels stay within preservation limits. Within eighteen months the team digitised 120,000 pages, and the project now lends equipment to smaller museums across the county.$gx_p1$
  ) returning id into v_p1_id;

  insert into public.reading_passages (
    test_id, passage_order, title, content
  ) values (
    v_test_id, 2, 'Rethinking Remote Work',
    $gx_p2$In a recent editorial, futurist Dana Ikeda contends that the debate about remote work has become too focused on individual convenience and not enough on the structure of cities. She acknowledges that home-working saved many employees from long commutes, yet she worries that office towers now sitting half empty could destabilise municipal budgets that rely on commuter spending. Ikeda rejects nostalgic calls to force everyone back to desks, arguing that hybrid schedules already help caregivers and disabled workers participate more fully in the labour market. Still, she maintains that companies have a responsibility to fund public spaces if they continue reducing their physical footprints.

Ikeda applauds a pilot scheme in which businesses converted unused boardrooms into bookable classrooms for local colleges, seeing it as proof that commercial real estate can serve community needs. She dismisses the idea that remote workers are inherently less collaborative, pointing to software firms that open their code reviews to global contributors. However, she criticises executives who expect staff to maintain home offices without subsidising equipment or energy costs. The essay concludes with a call for city planners, landlords, and unions to co-design a civic compact that balances flexibility with shared investment in downtown districts.$gx_p2$
  ) returning id into v_p2_id;

  insert into public.reading_passages (
    test_id, passage_order, title, content
  ) values (
    v_test_id, 3, 'Reclaiming the Aridia Desert',
    $gx_p3$The Aridia Desert Observatory sits on a plateau overlooking a patchwork of experimental restoration plots. Ecologist Jamal Mostafa and his team irrigate some plots with captured dew while leaving others to rely solely on seasonal rainfall. They sow native grass seeds alongside nitrogen-fixing shrubs, then record how quickly the plants stabilise dune surfaces. Drones fitted with multispectral cameras fly weekly transects to measure plant health. Because water is scarce, the observatory uses solar-powered condensers that collect moisture at night and store it in underground tanks insulated with recycled glass.

Beyond plant monitoring, the researchers collaborate with local herders who have agreed to rotate grazing schedules around the restored plots. Soil technicians sample microbial communities to see whether dung from goats accelerates nutrient cycles. The project also partners with an indigenous weavers' cooperative that harvests limited quantities of grass stems for traditional baskets, ensuring the restoration has cultural as well as ecological value. To share results, Mostafa hosts open days where visiting policymakers can compare experimental treatments. The observatory hopes to expand its methods to neighboring regions threatened by dune encroachment.$gx_p3$
  ) returning id into v_p3_id;

  -- Questions for Passage 1
  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 1, 'tfng',
    '1. The museum had already digitised most of its collection before 2019.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 2, 'tfng',
    '2. A weather alert prompted staff to speed up their documentation process.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 3, 'tfng',
    '3. The Civic Makers Collective supplied equipment tailored to the museum''s needs.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 4, 'tfng',
    '4. The scanning rigs require special rooms to be built at the museum.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 5, 'tfng',
    '5. Volunteers receive training on how to handle delicate items.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 6, 'tfng',
    '6. Each manuscript is scanned by a single volunteer working alone.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 7, 'tfng',
    '7. The workflow records physical damage alongside digital images.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 8, 'tfng',
    '8. Linguistics students help interpret unusual handwritten notes.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 9, 'tfng',
    '9. The project could not secure any external funding.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 10, 'tfng',
    '10. Environmental sensors help maintain safe conditions during scanning.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 11, 'tfng',
    '11. The team digitised fewer than ten thousand pages in total.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 12, 'tfng',
    '12. Other museums now make use of the scanning equipment.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 13, 'tfng',
    '13. The project plans to sell the digital files to private collectors.',
    NULL,
    NULL,
    'Not Given'::jsonb
  );


  -- Questions for Passage 2
  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 14, 'ynng',
    '14. Ikeda believes remote work discussions overlook urban economic impacts.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 15, 'ynng',
    '15. She thinks commuting should be made longer to support public transport.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 16, 'ynng',
    '16. Ikeda agrees that everyone should return to the office full-time.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 17, 'ynng',
    '17. She recognises the benefits hybrid schedules bring to certain workers.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 18, 'ynng',
    '18. Ikeda wants companies that shrink offices to contribute to civic infrastructure.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 19, 'ynng',
    '19. She opposes repurposing corporate spaces for educational use.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 20, 'ynng',
    '20. Ikeda cites global software collaborations as evidence of remote cooperation.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 21, 'ynng',
    '21. She praises executives who refuse to pay for employee equipment.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 22, 'ynng',
    '22. Ikeda suggests that remote workers are naturally less creative.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 23, 'ynng',
    '23. She proposes a partnership between urban planners and worker representatives.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 24, 'ynng',
    '24. Ikeda argues that downtown areas no longer need investment.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 25, 'ynng',
    '25. She believes municipal budgets benefit from empty office towers.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 26, 'ynng',
    '26. Ikeda views hybrid schedules as harmful to disabled workers.',
    NULL,
    NULL,
    'No'::jsonb
  );


  -- Questions for Passage 3
  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 27, 'mcq_single',
    '27. What is the main focus of the Aridia Desert Observatory''s plots?',
    NULL,
    '["A. Testing irrigation systems for commercial farms.", "B. Restoring native vegetation to stabilise dunes.", "C. Mining minerals from the plateau.", "D. Breeding livestock suited to arid climates."]'::jsonb,
    'B. Restoring native vegetation to stabilise dunes.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 28, 'mcq_single',
    '28. How do some plots receive additional moisture?',
    NULL,
    '["A. Through underground aquifers.", "B. From artificial rainmaking chemicals.", "C. Via dew captured and stored by the team.", "D. Using diverted river water."]'::jsonb,
    'C. Via dew captured and stored by the team.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 29, 'mcq_single',
    '29. Why are drones flown across the plots each week?',
    NULL,
    '["A. To track illegal grazing.", "B. To measure the growth and health of plants.", "C. To deliver seeds to remote areas.", "D. To record tourist visits to the site."]'::jsonb,
    'B. To measure the growth and health of plants.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 30, 'mcq_single',
    '30. What purpose do the solar-powered condensers serve?',
    NULL,
    '["A. They power the drones during daylight.", "B. They generate electricity for the observatory''s offices.", "C. They capture night-time moisture for storage.", "D. They cool the laboratory equipment."]'::jsonb,
    'C. They capture night-time moisture for storage.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 31, 'mcq_single',
    '31. How do local herders participate in the project?',
    NULL,
    '["A. By donating livestock for scientific experiments.", "B. By suspending grazing entirely in the region.", "C. By adjusting grazing times around restoration plots.", "D. By funding the observatory''s expansion."]'::jsonb,
    'C. By adjusting grazing times around restoration plots.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 32, 'mcq_single',
    '32. What do soil technicians investigate?',
    NULL,
    '["A. The mineral composition of plateau rocks.", "B. The impact of animal waste on microbial life.", "C. The number of tourists visiting each month.", "D. The best routes for transporting baskets."]'::jsonb,
    'B. The impact of animal waste on microbial life.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 33, 'mcq_single',
    '33. Why does the project work with an indigenous weaving cooperative?',
    NULL,
    '["A. To sell baskets in international markets.", "B. To ensure the restoration supports cultural practices.", "C. To replace grass species with imported fibres.", "D. To train researchers in traditional art forms."]'::jsonb,
    'B. To ensure the restoration supports cultural practices.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 34, 'mcq_single',
    '34. What is the goal of the open days hosted by Mostafa?',
    NULL,
    '["A. To recruit international tourists.", "B. To compare restoration methods with visiting officials.", "C. To sell restored land to private investors.", "D. To advertise academic conferences."]'::jsonb,
    'B. To compare restoration methods with visiting officials.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 35, 'mcq_single',
    '35. What broader ambition does the observatory have?',
    NULL,
    '["A. To convert the plateau into farmland.", "B. To export desert grasses internationally.", "C. To scale restoration techniques to nearby regions.", "D. To establish a wildlife reserve for predators."]'::jsonb,
    'C. To scale restoration techniques to nearby regions.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 36, 'mcq_single',
    '36. What combination of plants do researchers sow in the plots?',
    NULL,
    '["A. Only nitrogen-fixing shrubs.", "B. Imported ornamental species.", "C. Native grasses with nitrogen-fixing shrubs.", "D. Exclusively drought-resistant cacti."]'::jsonb,
    'C. Native grasses with nitrogen-fixing shrubs.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 37, 'mcq_single',
    '37. What aspect of the project highlights community involvement?',
    NULL,
    '["A. Private investors funding dew collectors.", "B. Local herders coordinating grazing schedules.", "C. International tourists volunteering on weekends.", "D. Government ministers staffing the drones."]'::jsonb,
    'B. Local herders coordinating grazing schedules.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 38, 'mcq_single',
    '38. How are the underground tanks insulated?',
    NULL,
    '["A. With imported aluminium sheeting.", "B. With layers of recycled glass.", "C. With thick clay walls.", "D. With woven grass mats."]'::jsonb,
    'B. With layers of recycled glass.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 39, 'matching_information',
    '39. Match each group involved with the contribution they make.',
    NULL,
    '{"pairs": [{"left": "Herders", "right": ["Staggering grazing around plots"]}, {"left": "Soil technicians", "right": ["Assessing microbial communities"]}, {"left": "Weavers'' cooperative", "right": ["Using grasses in traditional crafts"]}, {"left": "Policymakers", "right": ["Observing treatment comparisons on open days"]}]}'::jsonb,
    'Herders -> Staggering grazing around plots'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 40, 'mcq_single',
    '40. What motivates the observatory''s collaboration with policymakers?',
    NULL,
    '["A. To secure permits for mining operations.", "B. To demonstrate restoration outcomes for wider adoption.", "C. To negotiate grazing rights for private ranchers.", "D. To market tourist packages in the desert."]'::jsonb,
    'B. To demonstrate restoration outcomes for wider adoption.'::jsonb
  );


end $$;
