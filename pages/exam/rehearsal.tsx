import DeviceCheck from '@/components/exam/DeviceCheck';
import TimingRehearsal from '@/components/exam/TimingRehearsal';
import AnxietyScripts from '@/components/exam/AnxietyScripts';
import ExamChecklist from '@/components/exam/ExamChecklist';
import ExamResourceLayout from '@/components/layouts/ExamResourceLayout';

export default function ExamRehearsalPage() {
  return (
    <ExamResourceLayout title="Exam rehearsal">
      <div className="space-y-8">
        <DeviceCheck />
        <TimingRehearsal />
        <AnxietyScripts />
        <ExamChecklist />
      </div>
    </ExamResourceLayout>
  );
}
