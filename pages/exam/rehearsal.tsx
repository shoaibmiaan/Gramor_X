import DeviceCheck from '@/components/exam/DeviceCheck';
import TimingRehearsal from '@/components/exam/TimingRehearsal';
import AnxietyScripts from '@/components/exam/AnxietyScripts';
import ExamChecklist from '@/components/exam/ExamChecklist';

export default function ExamRehearsalPage() {
  return (
    <div className="space-y-8">
      <DeviceCheck />
      <TimingRehearsal />
      <AnxietyScripts />
      <ExamChecklist />
    </div>
  );
}
