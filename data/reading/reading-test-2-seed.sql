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
    'reading-test-2',
    'Reading Practice Test 7 — Orchard Renewal',
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
    v_test_id, 1, 'Restoring Edgewood Orchard',
    $gx_p1$Rivershire's Edgewood orchard had been left to collapse after the last caretaker retired in 1982. The market for eating apples in the Midlands had slumped, and the county council who owned the land cut down the irrigation pipes and let the hedges grow wild. When the Rivershire Horticultural Trust visited the site in 2021 they found only eight gnarled trees still fruiting and a tangle of brambles covering the remaining acre. Trust director Salma Dhar remembered a 1978 agricultural survey that catalogued forty-two varieties planted at Edgewood, many of them now difficult to find in commercial nurseries. She persuaded the council to lease the orchard for a token one pound a year so that volunteers could restore it as a community food source.

The restoration began with mapping the surviving tree stock and scouring nearby villages for scion wood. Retired pomologist Eric Lynes ran weekend grafting workshops that trained more than sixty volunteers in how to raise new rootstocks. The project also introduced flowering meadows for local beekeepers, and a soil laboratory at Rivershire College analysed mineral deficiencies caused by decades of neglect. Instead of ripping out the hedges, the team layered them to form wildlife corridors. By the autumn of 2023 the trust had replanted thirty saplings and installed discreet rain-fed tanks to replace the lost irrigation. Local schools now use the orchard for science lessons, and a small farm shop sells juice pressed on-site each Friday.$gx_p1$
  ) returning id into v_p1_id;

  insert into public.reading_passages (
    test_id, passage_order, title, content
  ) values (
    v_test_id, 2, 'Reimagining Midtown''s Streets',
    $gx_p2$Midtown's experiment with rentable electric scooters has polarised residents, and columnist Javier Moreno argues that the disagreement hides a deeper question about who city streets are for. He notes that the pilot programme was launched with minimal consultation, leaving community groups feeling ignored, yet he concedes that the scooters quickly replaced thousands of short car journeys. Moreno dismisses claims that they are inherently dangerous, pointing out that injury rates published by the transit authority mirror those seen when bicycles first expanded in the 1990s. He is more concerned about clutter, arguing that parking hubs were rolled out too slowly for pavements as narrow as Midtown's.

Moreno believes that regulating scooter speeds would calm tensions with pedestrians, but he rejects the idea of a blanket ban. In his view, the city has historically privileged motorists, and reallocating road space is overdue. He praises a recent council decision to convert two parking lanes into protected scooter and cycle corridors, suggesting that the move will also help small businesses by freeing up delivery bays. Critics worry that tourists will be confused by the new layouts, but Moreno counters that clear signage and multilingual tutorials already exist. He concludes that the scooter programme should continue only if officials commit to co-designing street changes with neighbourhood councils.$gx_p2$
  ) returning id into v_p2_id;

  insert into public.reading_passages (
    test_id, passage_order, title, content
  ) values (
    v_test_id, 3, 'Tracking Tidal Light',
    $gx_p3$Marine biologist Wei-Ling Zhao leads the Tidal Light Initiative, a collaboration among four coastal laboratories that study bioluminescent organisms. Their latest project, GlowLine, tracks seasonal blooms of plankton that emit light when disturbed by waves. The team deploys fibre-optic cables along three estuaries to record flashes and compare them with satellite imagery. Zhao pairs the optical data with genetic samples collected by divers, revealing that each bloom contains dozens of distinct species. Funding from the Ocean Futures Fund allowed the group to build a mobile laboratory on a retrofitted ferry so that school groups can join overnight surveys.

The scientists are keen to move beyond observation. They test how temperature shifts alter light intensity and are experimenting with biodegradable sensors that degrade after six weeks. Engineer Marta Ruiz is developing a machine-learning model that predicts where GlowLine should anchor the ferry to capture the brightest displays. The model analyses tidal flow, nutrient levels, and even the wake from commercial ships. Because nearby fisheries worry that the work could disrupt spawning, Zhao hosts monthly forums with boat captains to share results. The team has also begun working with lighting designers who want to apply bioluminescent principles to energy-efficient waterfront installations.$gx_p3$
  ) returning id into v_p3_id;

  -- Questions for Passage 1
  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 1, 'tfng',
    '1. The county council initiated the plans to restore Edgewood orchard.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 2, 'tfng',
    '2. The orchard stopped being cared for in the early 1980s.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 3, 'tfng',
    '3. Irrigation equipment was removed before the orchard was abandoned.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 4, 'tfng',
    '4. The 1978 survey recorded fewer than twenty types of apples at Edgewood.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 5, 'tfng',
    '5. Some of the apple varieties from Edgewood are rare in modern nurseries.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 6, 'tfng',
    '6. The trust pays a large annual rent for the orchard lease.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 7, 'tfng',
    '7. Volunteers located new plant material in neighbouring settlements.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 8, 'tfng',
    '8. Only professional horticulturalists were allowed to attend the grafting workshops.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 9, 'tfng',
    '9. The project decided to remove the overgrown hedges entirely.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 10, 'tfng',
    '10. Rivershire College contributed scientific support to the restoration.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 11, 'tfng',
    '11. The new irrigation tanks rely on rainwater.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 12, 'tfng',
    '12. Local children are prohibited from visiting the orchard.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 13, 'tfng',
    '13. Juice from the orchard is sold directly to residents.',
    NULL,
    NULL,
    'True'::jsonb
  );


  -- Questions for Passage 2
  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 14, 'ynng',
    '14. Moreno thinks officials consulted local organisations adequately before launching the scooter scheme.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 15, 'ynng',
    '15. He accepts that scooters have replaced many brief car trips in Midtown.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 16, 'ynng',
    '16. Moreno believes scooters are more dangerous than bicycles were when first introduced.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 17, 'ynng',
    '17. He is worried about how parked scooters block narrow pavements.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 18, 'ynng',
    '18. Moreno wants scooters to be banned completely from Midtown.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 19, 'ynng',
    '19. He argues that city streets have long prioritised car drivers.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 20, 'ynng',
    '20. Moreno disapproves of converting parking lanes into scooter corridors.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 21, 'ynng',
    '21. He thinks the new corridors could benefit local shops.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 22, 'ynng',
    '22. Moreno is sceptical that signage will help tourists use the system.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 23, 'ynng',
    '23. He proposes that any continuation of the programme must involve neighbourhood input.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 24, 'ynng',
    '24. Moreno says scooter speeds should remain unregulated.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 25, 'ynng',
    '25. He insists that multilingual tutorials do not yet exist.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 26, 'ynng',
    '26. Moreno criticises the council for reallocating delivery bays.',
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
    '27. What is the primary aim of the GlowLine project?',
    NULL,
    '["A. To engineer brighter artificial lights for harbours.", "B. To monitor naturally occurring luminous plankton.", "C. To replace satellite data with underwater cameras.", "D. To map fishing routes along the coast."]'::jsonb,
    'B. To monitor naturally occurring luminous plankton.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 28, 'mcq_single',
    '28. How do researchers compare the light captured by the fibre-optic cables?',
    NULL,
    '["A. By checking it against archives from previous decades.", "B. By measuring the angle of waves hitting the shore.", "C. By matching it with readings taken from orbit.", "D. By timing the dives of marine mammals."]'::jsonb,
    'C. By matching it with readings taken from orbit.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 29, 'mcq_single',
    '29. What has the genetic sampling revealed about each bloom?',
    NULL,
    '["A. They are dominated by a single hardy species.", "B. They consist of many different kinds of plankton.", "C. They are caused by pollutants from ferries.", "D. They rarely occur in estuaries."]'::jsonb,
    'B. They consist of many different kinds of plankton.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 30, 'mcq_single',
    '30. Why was a ferry converted into a mobile laboratory?',
    NULL,
    '["A. To host visiting students during overnight studies.", "B. To transport equipment between the four laboratories.", "C. To provide housing for the research staff.", "D. To replace the need for fixed coastal stations."]'::jsonb,
    'A. To host visiting students during overnight studies.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 31, 'mcq_single',
    '31. What do the scientists investigate in addition to observing the plankton?',
    NULL,
    '["A. The economic value of tourism generated by the displays.", "B. The influence of temperature changes on emitted light.", "C. The possibility of exporting specimens overseas.", "D. The nutritional benefits of plankton for aquaculture."]'::jsonb,
    'B. The influence of temperature changes on emitted light.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 32, 'mcq_single',
    '32. What feature do the new sensors being trialled share?',
    NULL,
    '["A. They automatically repair themselves after storms.", "B. They transmit data without using batteries.", "C. They decompose naturally within a set period.", "D. They attach to whales for migration studies."]'::jsonb,
    'C. They decompose naturally within a set period.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 33, 'mcq_single',
    '33. What is the role of the predictive model designed by Marta Ruiz?',
    NULL,
    '["A. To inform the best places to position the research ferry.", "B. To monitor the wake created by fishing trawlers.", "C. To control the brightness of coastal lighting.", "D. To determine which species should be sampled next."]'::jsonb,
    'A. To inform the best places to position the research ferry.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 34, 'mcq_single',
    '34. Which factor is NOT mentioned as an input for the model?',
    NULL,
    '["A. Tidal movements.", "B. Nutrient availability.", "C. Weather forecasts.", "D. Disturbance from ships."]'::jsonb,
    'C. Weather forecasts.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 35, 'mcq_single',
    '35. Why do local fisheries monitor GlowLine''s activity?',
    NULL,
    '["A. They fear the project could interfere with breeding cycles.", "B. They want to invest in the mobile laboratory.", "C. They depend on the team for satellite data.", "D. They hope to hire students trained by the project."]'::jsonb,
    'A. They fear the project could interfere with breeding cycles.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 36, 'mcq_single',
    '36. How does Zhao address the concerns of boat captains?',
    NULL,
    '["A. By limiting surveys to off-season months.", "B. By organising monthly public meetings.", "C. By offering compensation for delays.", "D. By relocating research to different estuaries."]'::jsonb,
    'B. By organising monthly public meetings.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 37, 'mcq_single',
    '37. Who is collaborating with the scientists to adapt bioluminescent ideas?',
    NULL,
    '["A. Offshore drilling companies.", "B. Coastal lighting designers.", "C. Maritime historians.", "D. Government defence contractors."]'::jsonb,
    'B. Coastal lighting designers.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 38, 'mcq_single',
    '38. What does the mobile lab allow school groups to do?',
    NULL,
    '["A. Participate in overnight field research.", "B. Complete university-level genetics courses.", "C. Manage the ferry''s navigation system.", "D. Collect specimens for private aquariums."]'::jsonb,
    'A. Participate in overnight field research.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 39, 'matching_information',
    '39. Match each research component with the purpose described in the passage.',
    NULL,
    '{"pairs": [{"left": "Fibre-optic cables", "right": ["Recording flashes produced in the water"]}, {"left": "Genetic sampling", "right": ["Identifying the diversity of species in blooms"]}, {"left": "Biodegradable sensors", "right": ["Reducing the environmental footprint of monitoring"]}, {"left": "Machine-learning model", "right": ["Forecasting where to position observation platforms"]}]}'::jsonb,
    'Fibre-optic cables -> Recording flashes produced in the water'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 40, 'mcq_single',
    '40. What condition does Zhao set for future waterfront lighting projects?',
    NULL,
    '["A. They must directly fund GlowLine''s fieldwork.", "B. They should rely exclusively on solar power.", "C. They need to respect lessons learned from bioluminescence.", "D. They have to be supervised by the Ocean Futures Fund."]'::jsonb,
    'C. They need to respect lessons learned from bioluminescence.'::jsonb
  );


end $$;
