// pages/PremiumExamPage.tsx
import { PremiumRoom } from '../../premium-ui/access/PremiumRoom';
import { ExamShell } from '../../premium-ui/exam/ExamShell';
import { Scratchpad } from '../../premium-ui/exam/Scratchpad';
import { MediaDock } from '../../premium-ui/exam/MediaDock';

export default function PremiumExamPage() {
  const handleAccessGranted = () => {
    // Track analytics, update user state, etc.
    console.log('Premium exam room access granted');
  };

  const handleAccessRevoked = () => {
    console.log('User left the premium room');
  };

  return (
    <PremiumRoom
      roomId="ielts-advanced-001"
      roomName="IELTS Advanced Practice Test"
      description="Full-length practice test with detailed analytics and AI feedback"
      onAccessGranted={handleAccessGranted}
      onAccessRevoked={handleAccessRevoked}
      showRoomHeader={true}
    >
      <ExamShell
        attemptId="premium-ielts-001"
        title="IELTS Advanced Practice Test"
        seconds={3600}
        totalQuestions={40}
        currentQuestion={1}
        question={{
          number: 1,
          prompt: "What is the main purpose of the text?",
          options: [
            { key: "A", label: "To inform" },
            { key: "B", label: "To persuade" },
            { key: "C", label: "To entertain" },
            { key: "D", label: "To describe" }
          ]
        }}
        onAnswer={(answer) => console.log('Answer:', answer)}
        onNavigate={(q) => console.log('Navigate to:', q)}
        scratchpad={<Scratchpad />}
        mediaDock={<MediaDock />}
      />
    </PremiumRoom>
  );
}
