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
    'reading-test-5',
    'Reading Practice Test 10 — Urban Forests',
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
    v_test_id, 1, 'Charting Larkhaven''s Canopy',
    $gx_p1$After a 2015 heatwave, the city of Larkhaven discovered that only 21 percent of its streets were shaded by tree canopy. The council launched a canopy audit that combined drone-mounted LiDAR with neighbourhood volunteers walking assigned blocks. Participants used a mobile app to photograph tree pits, tag empty ones, and report where roots were damaging pavements. University ecologists processed the scans to build a 3D model showing gaps in coverage during peak afternoon heat. The survey also recorded species diversity, revealing that two-thirds of the canopy relied on just three types of plane tree vulnerable to the same blight.

Armed with the data, Larkhaven created a planting schedule that prioritised bus corridors, public-housing courtyards, and schools with asphalt playgrounds. Engineers trialled structural soil cells beneath footpaths to give roots more space without disturbing utilities. The council introduced cooling grants for businesses willing to host micro-forest planters on flat roofs, and stormwater teams mapped where new trees could double as flood buffers. Residents now receive seasonal care reminders through the same app used for the audit, while a public dashboard shows canopy gains street by street. Within four years the city increased its shaded area by five percentage points.$gx_p1$
  ) returning id into v_p1_id;

  insert into public.reading_passages (
    test_id, passage_order, title, content
  ) values (
    v_test_id, 2, 'Libraries Beyond the Card',
    $gx_p2$Cultural critic Mateo Ruiz argues that public libraries should rethink how they measure membership. He notes that many branches still prioritise issuing plastic cards, even though digital borrowing and community workshops drive most visits. Ruiz praises libraries that treat anyone attending an event as a member for the day, making it easier to justify funding for programmes beyond book lending. He rejects subscription models that require monthly fees, insisting that libraries remain one of the few civic spaces without purchase requirements.

Ruiz acknowledges that data about who uses libraries can help tailor services, but he warns against surveillance-style tracking of individual reading habits. Instead he proposes anonymous surveys and community panels to decide which services matter most. He also champions libraries that offer fabrication labs and job clinics, arguing that such resources expand their social mission. The essay concludes by calling on city councils to evaluate success through measures of community wellbeing rather than the number of active cards in the database.$gx_p2$
  ) returning id into v_p2_id;

  insert into public.reading_passages (
    test_id, passage_order, title, content
  ) values (
    v_test_id, 3, 'Coral Nurseries of West Africa',
    $gx_p3$Marine ecologist Farah Mensah coordinates coral nurseries across a chain of West African islands. Divers collect small fragments from resilient parent colonies and attach them to suspended ropes where currents deliver nutrients without smothering sediment. Mensah's team logs each fragment's growth with waterproof tablets and rotates the ropes monthly to ensure even sunlight exposure. When fragments reach a target size, they are outplanted on degraded reefs using eco-friendly cement that dissolves once the coral secures itself. Local fishers assist by mapping areas where reef recovery could boost spawning grounds.

To protect the nurseries from temperature spikes, the team installs shade sails made from recycled sails donated by racing crews. Marine meteorologists feed real-time forecasts into a dashboard that alerts divers when bleaching conditions loom, prompting them to lower nursery racks into deeper, cooler water. Mensah partners with tourism operators who offer snorkel tours that fund monitoring while educating visitors about reef stewardship. Researchers also experiment with probiotics that may help corals resist disease, carefully documenting outcomes before scaling up. The programme's success has inspired neighbouring countries to adopt similar rope-based nurseries.$gx_p3$
  ) returning id into v_p3_id;

  -- Questions for Passage 1
  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 1, 'tfng',
    '1. The canopy audit began in response to a prolonged heatwave.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 2, 'tfng',
    '2. Larkhaven already had more than half its streets shaded before the project.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 3, 'tfng',
    '3. Volunteers collected information while walking through neighbourhoods.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 4, 'tfng',
    '4. The audit relied exclusively on satellite imagery.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 5, 'tfng',
    '5. Researchers produced a three-dimensional map of shade coverage.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 6, 'tfng',
    '6. Most of the existing canopy consisted of a few tree species.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 7, 'tfng',
    '7. The planting plan ignored public transport routes.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 8, 'tfng',
    '8. Structural soil cells were tested to protect underground services.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 9, 'tfng',
    '9. Cooling grants encouraged rooftop micro-forests.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 10, 'tfng',
    '10. Stormwater teams considered flood mitigation when placing new trees.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 11, 'tfng',
    '11. The mobile app was discarded once planting finished.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 12, 'tfng',
    '12. Residents can track canopy progress via an online dashboard.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 13, 'tfng',
    '13. The project reduced overall canopy coverage within four years.',
    NULL,
    NULL,
    'False'::jsonb
  );


  -- Questions for Passage 2
  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 14, 'ynng',
    '14. Ruiz believes library membership should be linked to more than card ownership.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 15, 'ynng',
    '15. He supports charging monthly fees to fund library services.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 16, 'ynng',
    '16. Ruiz approves of counting event attendees as temporary members.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 17, 'ynng',
    '17. He argues that libraries should focus solely on lending books.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 18, 'ynng',
    '18. Ruiz cautions against tracking individual borrowing habits too closely.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 19, 'ynng',
    '19. He proposes anonymous surveys to understand community needs.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 20, 'ynng',
    '20. Ruiz disapproves of libraries providing job-related support.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 21, 'ynng',
    '21. He wants city councils to assess libraries using wellbeing indicators.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 22, 'ynng',
    '22. Ruiz thinks plastic cards remain the best way to justify funding.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 23, 'ynng',
    '23. He states that fabrication labs fall outside a library''s mission.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 24, 'ynng',
    '24. Ruiz claims people should have to purchase something to use library space.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 25, 'ynng',
    '25. He believes digital borrowing has little impact on visits.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 26, 'ynng',
    '26. Ruiz argues that data can help tailor services when gathered respectfully.',
    NULL,
    NULL,
    'Yes'::jsonb
  );


  -- Questions for Passage 3
  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 27, 'mcq_single',
    '27. Why are coral fragments suspended on ropes?',
    NULL,
    '["A. To keep them away from herbivorous fish.", "B. To ensure water flows bring nutrients without burying them in sediment.", "C. To reduce the need for divers to monitor them.", "D. To simplify transportation between islands."]'::jsonb,
    'B. To ensure water flows bring nutrients without burying them in sediment.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 28, 'mcq_single',
    '28. How does the team document coral growth?',
    NULL,
    '["A. By sketching illustrations on waterproof paper.", "B. By photographing fragments with drones.", "C. By recording measurements on waterproof tablets.", "D. By estimating size from boat-based observations."]'::jsonb,
    'C. By recording measurements on waterproof tablets.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 29, 'mcq_single',
    '29. What happens when fragments reach the desired size?',
    NULL,
    '["A. They are sold to aquariums.", "B. They are relocated onto damaged reefs.", "C. They are stored in laboratory tanks.", "D. They are exchanged with other nurseries."]'::jsonb,
    'B. They are relocated onto damaged reefs.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 30, 'mcq_single',
    '30. What role do local fishers play?',
    NULL,
    '["A. They regulate tourist numbers at the nurseries.", "B. They map restoration sites that support spawning.", "C. They supply boats for meteorological surveys.", "D. They provide coral fragments from their nets."]'::jsonb,
    'B. They map restoration sites that support spawning.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 31, 'mcq_single',
    '31. Why are shade sails installed above the nurseries?',
    NULL,
    '["A. To prevent birds from landing on the ropes.", "B. To stabilise the racks during storms.", "C. To limit temperature spikes caused by intense sunlight.", "D. To harvest rainwater for use on land."]'::jsonb,
    'C. To limit temperature spikes caused by intense sunlight.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 32, 'mcq_single',
    '32. What triggers divers to lower nursery racks deeper?',
    NULL,
    '["A. Forecasts indicating bleaching conditions.", "B. Requests from tourism operators.", "C. Monthly funding cycles.", "D. The growth of nuisance algae."]'::jsonb,
    'A. Forecasts indicating bleaching conditions.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 33, 'mcq_single',
    '33. How are the nurseries funded in part?',
    NULL,
    '["A. Through government fines on fishing vessels.", "B. Via snorkel tours organised with tourism operators.", "C. By selling eco-cement recipes to contractors.", "D. By charging divers monthly membership fees."]'::jsonb,
    'B. Via snorkel tours organised with tourism operators.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 34, 'mcq_single',
    '34. What experimental treatment is being tested?',
    NULL,
    '["A. Robotic cleaning arms.", "B. Artificial lighting systems.", "C. Beneficial probiotics applied to corals.", "D. Acoustic speakers playing reef sounds."]'::jsonb,
    'C. Beneficial probiotics applied to corals.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 35, 'mcq_single',
    '35. Why does the eco-friendly cement dissolve over time?',
    NULL,
    '["A. To release nutrients into the water.", "B. To allow coral to secure itself naturally to the substrate.", "C. To avoid leaving metal hardware on the reef.", "D. To make room for new fragments."]'::jsonb,
    'B. To allow coral to secure itself naturally to the substrate.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 36, 'mcq_single',
    '36. Who supplies the material for the shade sails?',
    NULL,
    '["A. Local fishermen repairing nets.", "B. Racing crews donating old sails.", "C. Manufacturers producing recycled plastics.", "D. Government-run textile factories."]'::jsonb,
    'B. Racing crews donating old sails.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 37, 'mcq_single',
    '37. What information feeds into the team''s alert dashboard?',
    NULL,
    '["A. Satellite images of tourism boats.", "B. Weather forecasts from marine meteorologists.", "C. Financial reports from partner resorts.", "D. Real-estate data about coastal development."]'::jsonb,
    'B. Weather forecasts from marine meteorologists.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 38, 'mcq_single',
    '38. How are visitors educated about reef care?',
    NULL,
    '["A. Through interactive exhibits at the airport.", "B. During snorkel tours that fund monitoring.", "C. Via mail-out pamphlets sent annually.", "D. By mandatory online exams before travel."]'::jsonb,
    'B. During snorkel tours that fund monitoring.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 39, 'matching_information',
    '39. Match each action with its purpose in the nursery programme.',
    NULL,
    '{"pairs": [{"left": "Rotating nursery ropes", "right": ["Ensuring even sunlight"]}, {"left": "Lowering racks", "right": ["Escaping heat stress"]}, {"left": "Eco-friendly cement", "right": ["Securing fragments to reefs"]}, {"left": "Probiotic trials", "right": ["Testing resistance to disease"]}]}'::jsonb,
    'Rotating nursery ropes -> Ensuring even sunlight'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 40, 'mcq_single',
    '40. What broader impact has the programme achieved?',
    NULL,
    '["A. Inspiring neighbouring countries to adopt similar nurseries.", "B. Replacing fishing as the islands'' main industry.", "C. Eliminating the need for reef monitoring.", "D. Ending tourism partnerships on the islands."]'::jsonb,
    'A. Inspiring neighbouring countries to adopt similar nurseries.'::jsonb
  );


end $$;
