# Writing Test — User Guideline & Full-Fledge Test Scenarios

This guide helps learners prepare for and complete a full IELTS-style Writing mock exam inside Gramor X. It also outlines the full test scenarios our QA team runs to verify the experience end-to-end.

## User Guideline for Attempting the Writing Test

1. **Prepare your environment**
   - Use a distraction-free space and a reliable desktop or tablet browser.
   - Keep reference materials closed; the mock test is designed to simulate real exam pressure.
   - Confirm your keyboard input language is set correctly if you rely on accented characters.

2. **Review task instructions before you type**
   - Read both Task 1 and Task 2 prompts in full.
   - Note the recommended structure tips shown in the prompt panel, including minimum word counts (150 words for Task 1, 250 words for Task 2).
   - Decide which task you will tackle first—Task 2 often benefits from more planning time.

3. **Plan your response**
   - Spend 3–4 minutes outlining your main ideas in short bullet points.
   - Identify examples or data points you want to highlight; this reduces mid-essay pauses.
   - Allocate time: ~20 minutes for Task 1, ~40 minutes for Task 2.

4. **Write with the built-in tools**
   - Type directly into the editor; autosave runs every few seconds, so you do not need separate backups.
   - Toggle the **Voice Draft** mode if you prefer to dictate notes, then refine them in text mode.
   - Keep an eye on the live word counter on each task tab to ensure you meet the minimum length.

5. **Review and edit before submission**
   - Re-read each response for coherence, paragraphing, and grammar.
   - Use the remaining time to proofread transitions and vocabulary choices.
   - Submit both tasks together by clicking **Submit for scoring**; results appear after the AI finishes scoring.

6. **After submitting**
   - Download the feedback PDF if you want an offline record.
   - Revisit the rubric breakdown to understand strengths and weaknesses.
   - Schedule a follow-up attempt using the same guidelines to track improvement.

## Full-Length Writing Exam Sets

Use the following ready-to-run mock exams whenever you need realistic prompts. Each set mirrors an actual IELTS Academic Writing exam with Task 1 (visual data description) and Task 2 (argumentative essay). Configure the exam duration to 60 minutes and reuse these prompts in demos, QA automation scripts, or learner practice sessions.

### Exam Set A — Renewable Energy Adoption

- **Task 1 (150+ words)**: _The charts below show the percentage of electricity generated from solar, wind, hydroelectric, and fossil fuel sources in four countries (Germany, India, Brazil, and Australia) in 2010 and 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant._
- **Task 2 (250+ words)**: _Some people believe governments should invest heavily in renewable energy infrastructure, while others argue that funding should prioritize improving the existing power grid. Discuss both views and give your own opinion._

### Exam Set B — Urban Transport Planning

- **Task 1 (150+ words)**: _The table and pie chart below provide information about daily commuting methods in a European city in 2000 and 2020, as well as projected figures for 2030. Summarize the information by selecting and reporting the main features, and make comparisons where relevant._
- **Task 2 (250+ words)**: _In many cities, policymakers are debating whether to restrict private car usage in downtown areas in favor of public transportation and cycling. To what extent do you agree or disagree with this proposal?_

### Exam Set C — Digital Education Access

- **Task 1 (150+ words)**: _The line graph below illustrates the percentage of students with access to high-speed internet across three regions (North America, Asia-Pacific, and Sub-Saharan Africa) between 2005 and 2025. Summarize the information by selecting and reporting the main features, and make comparisons where relevant._
- **Task 2 (250+ words)**: _Some educators believe that digital learning platforms widen educational inequality, while others think they democratize access to quality instruction. Discuss both views and give your own opinion._

## Writing Full-Fledge Test Scenarios

These scenarios are executed in staging prior to every major release to ensure the Writing exam experience remains stable.

1. **Baseline completion flow**
   - Start a new mock attempt and confirm the countdown timer starts automatically.
   - Enter 160+ words in Task 1 and 270+ words in Task 2, switching between task tabs mid-way.
   - Submit manually and verify: autosave indicator shows the last save, success toast appears, results page loads with band scores.

2. **Autosave resume validation**
   - Begin an attempt, type at least 50 words in each task, then close the tab.
   - Reopen the exam from the dashboard; ensure the draft restoration banner shows the prior timestamp.
   - Continue writing and submit; confirm no duplicate attempts are created and feedback contains the full essay.

3. **Timer-driven auto submission**
   - Start an attempt and let the timer expire without submitting manually.
   - Check that the system auto-submits, displays the fallback error message if scoring fails, and prevents further edits.
   - Verify the attempt record is available on the review page with whatever content was saved.

4. **Voice Draft accessibility**
   - Enable the Voice Draft toggle on mobile and ensure microphone permissions prompt correctly.
   - Dictate a short outline, then switch back to typing; verify the transcript persists and can be edited normally.
   - Confirm the autosave indicator continues updating while voice input is active.
