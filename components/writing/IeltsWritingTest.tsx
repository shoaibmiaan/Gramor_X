import React, { useEffect, useMemo, useState } from "react";

type TaskId = "task1" | "task2";

const INITIAL_TIME_SECONDS = 59 * 60; // 59:00 like your HTML

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

export const IeltsWritingTest: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME_SECONDS);
  const [activeTask, setActiveTask] = useState<TaskId>("task1");
  const [instructionsHidden, setInstructionsHidden] = useState(false);
  const [answers, setAnswers] = useState<Record<TaskId, string>>({
    task1: "",
    task2: "",
  });

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const wordCount = useMemo(() => {
    const text = answers[activeTask].trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  }, [answers, activeTask]);

  const handleChangeAnswer = (task: TaskId, value: string) => {
    setAnswers((prev) => ({ ...prev, [task]: value }));
  };

  const handleToggleInstructions = () => {
    setInstructionsHidden((prev) => !prev);
  };

  const handleHelp = () => {
    // You can replace with a proper modal later
    alert(
      "Help:\n\n• Switch between Task 1 and Task 2 using the tabs.\n• Timer shows remaining time.\n• Word count updates as you type.\n• Use Submit when you are done."
    );
  };

  const handleSubmit = () => {
    // Replace this with your actual submit logic / API call
    console.log("Submitting answers:", answers);
    alert("Answers submitted (dummy). Wire this to your backend.");
  };

  const currentTaskNumber = activeTask === "task1" ? 1 : 2;

  return (
    <div className="test-container">
      {/* Header */}
      <header className="test-header">
        <div className="test-title">
          <i className="fas fa-pencil-alt" /> IELTS Writing Test (Computer-Based)
        </div>
        <div className="test-info">
          <div className="timer" id="timer">
            {formatTime(timeLeft)}
          </div>
          <div className="word-count" id="wordCount">
            Words: {wordCount}
          </div>
          <div className="header-controls">
            <button className="header-btn" id="helpBtn" onClick={handleHelp}>
              <i className="fas fa-question-circle" /> Help
            </button>
            <button
              className="header-btn"
              id="hideBtn"
              onClick={handleToggleInstructions}
            >
              <i className={instructionsHidden ? "fas fa-eye" : "fas fa-eye-slash"} />{" "}
              {instructionsHidden ? "Show" : "Hide"}
            </button>
            <button
              className="header-btn btn-submit"
              id="submitBtn"
              onClick={handleSubmit}
            >
              <i className="fas fa-paper-plane" /> Submit
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="test-content">
        {/* Left panel: Instructions */}
        {!instructionsHidden && (
          <div className="instructions-panel">
            <div className="task-selector">
              <button
                className={`task-tab ${activeTask === "task1" ? "active" : ""}`}
                onClick={() => setActiveTask("task1")}
              >
                Writing Task 1
              </button>
              <button
                className={`task-tab ${activeTask === "task2" ? "active" : ""}`}
                onClick={() => setActiveTask("task2")}
              >
                Writing Task 2
              </button>
            </div>

            {/* Task 1 content */}
            {activeTask === "task1" && (
              <div className="task-content active" id="task1Content">
                <h2 className="task-title">Writing Task 1</h2>
                <p className="task-text">
                  You should spend about <strong>20 minutes</strong> on this task.
                </p>
                <p className="task-text">
                  The chart below shows the percentage of households in different types of
                  rented and owned accommodation in England and Wales between 1918 and 2011.
                </p>
                <p className="task-text">
                  Summarise the information by selecting and reporting the main features, and
                  make comparisons where relevant.
                </p>

                {/* Chart placeholder – same feel as your HTML */}
                <div
                  style={{
                    backgroundColor: "#e9ecef",
                    padding: "20px",
                    borderRadius: "6px",
                    margin: "20px 0",
                    textAlign: "center",
                    fontSize: "14px",
                    color: "#6c757d",
                  }}
                >
                  [Chart Image Placeholder]
                </div>

                <div className="task-requirements">
                  <h3 style={{ marginBottom: 10 }}>Task Requirements:</h3>
                  <div className="requirement-item">
                    <i className="fas fa-check-circle" />
                    <span>Write at least 150 words</span>
                  </div>
                  <div className="requirement-item">
                    <i className="fas fa-check-circle" />
                    <span>Summarise key trends and make comparisons</span>
                  </div>
                </div>
              </div>
            )}

            {/* Task 2 content */}
            {activeTask === "task2" && (
              <div className="task-content active" id="task2Content">
                <h2 className="task-title">Writing Task 2</h2>
                <p className="task-text">
                  You should spend about <strong>40 minutes</strong> on this task.
                </p>
                <p className="task-text">
                  Some people believe that governments should focus their spending on public
                  services such as health care and education, rather than on arts such as music
                  and painting.
                </p>
                <p className="task-text">To what extent do you agree or disagree?</p>
                <p className="task-text">
                  Give reasons for your answer and include any relevant examples from your own
                  knowledge or experience.
                </p>

                <div className="task-requirements">
                  <h3 style={{ marginBottom: 10 }}>Task Requirements:</h3>
                  <div className="requirement-item">
                    <i className="fas fa-check-circle" />
                    <span>Write at least 250 words</span>
                  </div>
                  <div className="requirement-item">
                    <i className="fas fa-check-circle" />
                    <span>Present a clear opinion and support it with examples</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right panel: Answer area */}
        <div
          className="answer-panel"
          style={instructionsHidden ? { width: "100%" } : undefined}
        >
          <div className="answer-header">
            <div className="answer-title" id="currentTaskTitle">
              {activeTask === "task1" ? "Writing Task 1 Answer" : "Writing Task 2 Answer"}
            </div>
            <div className="answer-controls">
              {/* UI-only toolbar – you can wire actual actions later */}
              <button className="control-btn" title="Cut" type="button">
                <i className="fas fa-cut" />
              </button>
              <button className="control-btn" title="Copy" type="button">
                <i className="far fa-copy" />
              </button>
              <button className="control-btn" title="Paste" type="button">
                <i className="fas fa-paste" />
              </button>
              <button className="control-btn" title="Undo" type="button">
                <i className="fas fa-undo" />
              </button>
              <button className="control-btn" title="Redo" type="button">
                <i className="fas fa-redo" />
              </button>
            </div>
          </div>

          <div className="text-area-container">
            <textarea
              className="answer-textarea"
              id="answerTextarea"
              placeholder="Type your answer here..."
              value={answers[activeTask]}
              onChange={(e) => handleChangeAnswer(activeTask, e.target.value)}
            />
            <div className="text-area-footer">
              <div>
                <span id="currentWords">{wordCount}</span> words
              </div>
              <div>
                Press <strong>Ctrl+C</strong> to copy, <strong>Ctrl+V</strong> to paste
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="test-footer">
        <div className="test-progress">
          Writing Test • Task <span id="currentTaskNumber">{currentTaskNumber}</span> of 2
        </div>
        <div className="footer-controls">
          <button
            className="footer-btn btn-prev"
            type="button"
            onClick={() => setActiveTask("task1")}
          >
            <i className="fas fa-arrow-left" /> Previous
          </button>
          <button className="footer-btn btn-review" type="button">
            <i className="far fa-flag" /> Review
          </button>
          <button
            className="footer-btn btn-next"
            type="button"
            onClick={() => setActiveTask("task2")}
          >
            Next <i className="fas fa-arrow-right" />
          </button>
        </div>
      </footer>
    </div>
  );
};
