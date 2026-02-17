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
    'reading-test-4',
    'Reading Practice Test 9 — Historic Tide Mills',
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
    v_test_id, 1, 'Reviving the Belltide Tide Mill',
    $gx_p1$The Belltide Tide Mill last ground grain in 1936 before silting clogged its sluice gates. For decades the timber building sat empty beside the estuary, its gears rusting while saltwater crept into the stone foundations. In 2018 a local history society negotiated access and set about documenting the structure. Engineers surveyed the tide pond and found that rebuilding the sluice would require a modern gate fabricated from stainless steel to withstand current tidal surges. Volunteers stripped barnacles from the wheel, catalogued remaining cogs, and numbered each beam before it was dismantled for treatment.

Funding from a coastal resilience grant paid for a floating workshop barge so repairs could take place without blocking navigation. The team trained apprentices from a nearby shipyard to carve replacement teeth from seasoned oak, reviving skills rarely used in the region. Instead of turning the mill into a static museum, project leaders installed transparent panels and a mezzanine walkway so visitors could watch the machinery operate safely during demonstration tides. The restored mill now powers a small bakery next door and exports surplus electricity to the local grid. Researchers continue to monitor vibration sensors hidden within the beams to ensure the structure remains stable during spring tides.$gx_p1$
  ) returning id into v_p1_id;

  insert into public.reading_passages (
    test_id, passage_order, title, content
  ) values (
    v_test_id, 2, 'Partners in the Night Sky',
    $gx_p2$Astronomer Priya Khanna writes that the most exciting discoveries now emerge when professional observatories share work with amateur skywatchers. She argues that although large telescopes collect enormous datasets, automation cannot catch every fleeting phenomenon. Khanna cites the citizen-led NovaTrack network, which flagged a dimming star that later proved to host a dust cloud, as evidence that patient observers add value. She dismisses complaints that amateurs crowd observatory inboxes with erroneous reports, noting that machine-learning filters quickly sort high-quality data. What worries her more is that public agencies underfund the platforms that allow such collaboration.

Khanna applauds observatories that run remote training sessions and lend small robotic telescopes to schools, insisting that mentorship ensures reliable contributions. She contends that paying modest stipends to amateur coordinators would improve retention, especially in rural communities where broadband remains patchy. Critics warn that sharing raw data risks revealing proprietary discoveries, but Khanna counters that clear embargo policies already govern publication. She concludes that astronomy will stagnate if its institutions treat the public as passive spectators instead of partners.$gx_p2$
  ) returning id into v_p2_id;

  insert into public.reading_passages (
    test_id, passage_order, title, content
  ) values (
    v_test_id, 3, 'Modular Homes on the Move',
    $gx_p3$Architect Lina Bors develops modular housing units designed to be stacked temporarily on underused urban plots. Her team 3D-prints lightweight concrete shells with channels that accept interchangeable wall panels. Each module arrives on a flatbed truck and can be craned into place within four hours. Residents configure interior layouts by sliding prefabricated partitions that contain wiring and ventilation ducts. To reduce waste, panels are tracked with RFID tags so they can be refurbished and redeployed in future projects.

The prototype neighbourhood includes rooftop greenhouses irrigated by rainwater captured in bladder tanks. An energy management system balances power drawn from solar awnings with demand spikes from communal kitchens. Bors collaborates with social workers who match tenants to co-housing clusters based on accessibility needs. Local artists were commissioned to design façade screens, countering criticism that modular developments look monotonous. City officials monitor indoor air-quality sensors to assess whether the tight building envelope affects residents. After a three-year pilot, the team will relocate half the units to another district to test how easily communities can move with their housing.$gx_p3$
  ) returning id into v_p3_id;

  -- Questions for Passage 1
  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 1, 'tfng',
    '1. The tide mill remained operational until the late 1950s.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 2, 'tfng',
    '2. Saltwater had damaged the building''s foundations.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 3, 'tfng',
    '3. Access to the site was granted to the history society in 2018.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 4, 'tfng',
    '4. Engineers decided to recreate the sluice gate using traditional iron fittings.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 5, 'tfng',
    '5. Volunteers labelled components before removing them for restoration.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 6, 'tfng',
    '6. Repairs were conducted on land to avoid interfering with river traffic.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 7, 'tfng',
    '7. Shipyard apprentices learned to carve wooden gear teeth.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 8, 'tfng',
    '8. The mill was converted into a museum where machinery no longer moves.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 9, 'tfng',
    '9. Visitors can view the mill''s mechanisms while it operates.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 10, 'tfng',
    '10. The site generates electricity beyond what the bakery needs.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 11, 'tfng',
    '11. Researchers track the mill''s stability using sensors.',
    NULL,
    NULL,
    'True'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 12, 'tfng',
    '12. The restoration was entirely funded by ticket sales.',
    NULL,
    NULL,
    'False'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p1_id, 13, 'tfng',
    '13. The project has stopped monitoring tidal impacts on the mill.',
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
    '14. Khanna believes discoveries benefit from cooperation between professionals and amateurs.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 15, 'ynng',
    '15. She argues that automation alone is sufficient to spot every celestial event.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 16, 'ynng',
    '16. Khanna references NovaTrack as an example of successful collaboration.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 17, 'ynng',
    '17. She thinks amateur observations usually overwhelm scientists with useless messages.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 18, 'ynng',
    '18. Khanna worries about the lack of funding for collaboration tools.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 19, 'ynng',
    '19. She opposes remote training programmes for volunteers.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 20, 'ynng',
    '20. Khanna suggests lending equipment to schools helps maintain data quality.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 21, 'ynng',
    '21. She recommends compensating amateur coordinators for their time.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 22, 'ynng',
    '22. Khanna believes embargo policies are ineffective at protecting discoveries.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 23, 'ynng',
    '23. She fears astronomy will stagnate if the public is excluded.',
    NULL,
    NULL,
    'Yes'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 24, 'ynng',
    '24. Khanna claims rural broadband challenges make collaboration impossible.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 25, 'ynng',
    '25. She states that observatories should avoid sharing raw data altogether.',
    NULL,
    NULL,
    'No'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p2_id, 26, 'ynng',
    '26. Khanna views amateurs merely as spectators.',
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
    '27. What is distinctive about the housing shells Bors uses?',
    NULL,
    '["A. They are carved from reclaimed timber.", "B. They are 3D-printed with slots for interchangeable panels.", "C. They are inflated on-site using fabric membranes.", "D. They are manufactured from recycled glass bottles."]'::jsonb,
    'B. They are 3D-printed with slots for interchangeable panels.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 28, 'mcq_single',
    '28. How long does it take to install a module on site?',
    NULL,
    '["A. Less than half a day.", "B. Two full days including finishing.", "C. A week due to curing requirements.", "D. Several minutes once panels arrive."]'::jsonb,
    'A. Less than half a day.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 29, 'mcq_single',
    '29. How are interior layouts adjusted?',
    NULL,
    '["A. Residents request custom carpentry.", "B. Prefabricated partitions can be repositioned.", "C. Walls are demolished and rebuilt.", "D. Furniture doubles as structural support."]'::jsonb,
    'B. Prefabricated partitions can be repositioned.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 30, 'mcq_single',
    '30. Why are RFID tags attached to panels?',
    NULL,
    '["A. To monitor residents'' movements.", "B. To assist with future reuse and refurbishment.", "C. To unlock doors remotely.", "D. To provide wireless internet access."]'::jsonb,
    'B. To assist with future reuse and refurbishment.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 31, 'mcq_single',
    '31. What feature tops the prototype neighbourhood?',
    NULL,
    '["A. A helicopter landing pad.", "B. Rooftop greenhouses using captured rainwater.", "C. A sports stadium shared with the city.", "D. A radio tower for emergency services."]'::jsonb,
    'B. Rooftop greenhouses using captured rainwater.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 32, 'mcq_single',
    '32. How is energy managed within the development?',
    NULL,
    '["A. Diesel generators run at night.", "B. Power use is balanced between solar awnings and communal needs.", "C. Residents pay separate suppliers for each module.", "D. All electricity is imported from the national grid."]'::jsonb,
    'B. Power use is balanced between solar awnings and communal needs.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 33, 'mcq_single',
    '33. Who helps determine tenant groupings?',
    NULL,
    '["A. Local politicians.", "B. Social workers assessing accessibility.", "C. Architects from rival firms.", "D. Construction contractors."]'::jsonb,
    'B. Social workers assessing accessibility.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 34, 'mcq_single',
    '34. How did Bors address concerns about uniform building appearance?',
    NULL,
    '["A. By covering units with identical metal panels.", "B. By inviting artists to design façade screens.", "C. By banning exterior decoration.", "D. By painting every module grey."]'::jsonb,
    'B. By inviting artists to design façade screens.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 35, 'mcq_single',
    '35. What do city officials monitor in the units?',
    NULL,
    '["A. Noise levels from rooftop parties.", "B. Indoor air-quality sensors.", "C. Security camera footage.", "D. Cooking habits of residents."]'::jsonb,
    'B. Indoor air-quality sensors.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 36, 'mcq_single',
    '36. What happens after three years of the pilot?',
    NULL,
    '["A. The housing will be dismantled permanently.", "B. Half the units relocate to test portability.", "C. Residents must purchase their modules.", "D. The project will convert into office space."]'::jsonb,
    'B. Half the units relocate to test portability.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 37, 'mcq_single',
    '37. Why are bladder tanks included?',
    NULL,
    '["A. To store rainwater for the rooftop greenhouses.", "B. To provide emergency fire suppression foam.", "C. To cool the solar awnings at night.", "D. To collect sewage before treatment."]'::jsonb,
    'A. To store rainwater for the rooftop greenhouses.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 38, 'mcq_single',
    '38. What criticism do the façade screens respond to?',
    NULL,
    '["A. That modular housing is too expensive.", "B. That modular developments appear monotonous.", "C. That tenants dislike outdoor spaces.", "D. That modules cannot be stacked safely."]'::jsonb,
    'B. That modular developments appear monotonous.'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 39, 'matching_information',
    '39. Match each project partner with their contribution.',
    NULL,
    '{"pairs": [{"left": "Social workers", "right": ["Curating co-housing groupings"]}, {"left": "Artists", "right": ["Designing façade screens"]}, {"left": "City officials", "right": ["Reviewing air-quality data"]}, {"left": "RFID system", "right": ["Tracking panels for reuse"]}]}'::jsonb,
    'Social workers -> Curating co-housing groupings'::jsonb
  );

  insert into public.reading_questions (
    test_id, passage_id, question_order, question_type_id,
    prompt, instruction, options, correct_answer
  ) values (
    v_test_id, v_p3_id, 40, 'mcq_single',
    '40. What longer-term goal does relocating units serve?',
    NULL,
    '["A. Testing how easily communities can move with their housing.", "B. Selling modules to overseas buyers.", "C. Converting the site into retail space.", "D. Meeting legal requirements for demolition."]'::jsonb,
    'A. Testing how easily communities can move with their housing.'::jsonb
  );


end $$;
