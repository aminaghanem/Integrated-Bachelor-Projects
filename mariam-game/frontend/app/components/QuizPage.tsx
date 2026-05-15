// On every attempt, wrong question texts are tracked in wrongAnswers
// On attempt 2+, the moment the child gets their 2nd wrong answer, fetchAiQuestion is called silently in the background
// The next question in the array is swapped with the AI-generated one before the child even clicks Next — so it feels completely seamless
// aiTriggered ensures the swap only happens once per quiz session
// At the end of the quiz, PATCH /api/ai/quiz-attempt saves the attempt count and wrong answers to UserProgress for future attempts

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "../components/Navbar";

interface Question {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  isAiGenerated?: boolean;
}

interface Quiz {
  countryName: string;
  minToPass: number;
  passThreshold: number;
  questions: Question[];
}

export default function QuizPage({ countryName }: { countryName: string }) {
  const router = useRouter();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [isLastRevealed, setIsLastRevealed] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<string[]>([]); // question texts answered wrong
  const [aiTriggered, setAiTriggered] = useState(false); // ensures AI only fires once
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [countryId, setCountryId] = useState<string | null>(null);

  const getUserIdFromToken = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const base64Url = token.split(".")[1] || "";
      const base64 = base64Url
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), "=");
      return JSON.parse(atob(base64))?.id;
    } catch (error) {
      console.error("Invalid JWT token payload", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/quizzes/${countryName}`,
        );
        if (!res.ok) throw new Error("Quiz not found");
        const data = await res.json();
        setQuiz(data);
        // Fetch countryId and attempt number from progress
        const userId = getUserIdFromToken();
        if (userId) {
          const countryRes = await fetch(
            `http://localhost:5000/api/countries/${countryName}`,
          );
          const countryData = await countryRes.json();
          setCountryId(countryData._id);

          const progressRes = await fetch(
            `http://localhost:5000/api/progress/user/${userId}/country/${countryData._id}`,
          );
          if (progressRes.ok) {
            const progressData = await progressRes.json();
            setAttemptNumber((progressData.quizAttempts ?? 0) + 1);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [countryName]);

  if (loading)
    return (
      <div
        style={{
          background: "var(--blue-primary)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Navbar />
        <p style={{ color: "white", fontFamily: "Helvetica", fontSize: 24 }}>
          Loading quiz...
        </p>
      </div>
    );

  if (error || !quiz)
    return (
      <div
        style={{
          background: "var(--blue-primary)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Navbar />
        <p style={{ color: "white", fontFamily: "Helvetica", fontSize: 24 }}>
          Could not load quiz.
        </p>
      </div>
    );

  const question = quiz.questions[currentIndex];
  const isOdd = currentIndex % 2 === 0; // 0-indexed so Q1=even index=pink
  const isPink = isOdd;
  const cardImage = isPink ? "/quiz/card-pink.png" : "/quiz/card-yellow.png";
  const questionColor = isPink ? "white" : "black";
  const total = quiz.questions.length;
  const isLast = currentIndex === total - 1;

  const handleSelect = (option: string) => {
    if (revealed) return; // locked after reveal
    setSelected(option);
  };

  const updateQuizProgress = async (finalScore: number, passed: boolean) => {
    const userId = getUserIdFromToken();
    if (!userId) {
      console.error("No user token found for quiz progress update");
      return false;
    }

    try {
      const countryRes = await fetch(
        `http://localhost:5000/api/countries/${countryName}`,
      );
      if (!countryRes.ok) {
        console.error("Unable to resolve country ID", countryRes.statusText);
        return false;
      }
      const countryData = await countryRes.json();

      const progressRes = await fetch(
        `http://localhost:5000/api/progress/user/${userId}/country/${countryData._id}/quiz`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizScore: finalScore, quizPassed: passed }),
        },
      );

      if (!progressRes.ok) {
        const errBody = await progressRes.text();
        console.error(
          "Quiz progress update failed",
          progressRes.status,
          errBody,
        );
        return false;
      }

      return true;
    } catch (err) {
      console.error("Failed to update quiz progress", err);
      return false;
    }
  };

  const fetchAiQuestion = async (
    wrongQs: string[],
  ): Promise<Question | null> => {
    try {
      const res = await fetch("http://localhost:5000/api/ai/quiz-difficulty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryId,
          userId: getUserIdFromToken(),
        }),
      });
      if (!res.ok) {
        console.error("AI fetch failed:", res.status);
        return null;
      }
      const data = await res.json();

      console.log("🤖 AI response received:", data);

      // Shape the AI response into a Question object
      return {
        _id: "ai_generated",
        question: data.question,
        options: data.options.map((o: string) => o.replace(/^[A-D]\.\s*/, "")), // strip "A. " prefix
        correctAnswer:
          data.options
            .find((o: string) => o.startsWith(data.correctAnswer))
            ?.replace(/^[A-D]\.\s*/, "") ?? data.correctAnswer,
        isAiGenerated: true,
      };
    } catch {
      return null;
    }
  };

  const handleNext = async () => {
    if (!selected) return;

    if (!revealed) {
      // First click: reveal answer
      const correct = selected === question.correctAnswer;
      if (correct) {
        setScore((s) => s + 1);
      } else {
        // Track wrong answer
        const updatedWrong = [...wrongAnswers, question.question];
        setWrongAnswers(updatedWrong);

        // If attempt 2 and just hit 2 wrong answers — inject AI question
        if (
          attemptNumber >= 2 &&
          updatedWrong.length === 2 &&
          !aiTriggered &&
          quiz
        ) {
          setAiTriggered(true);
          const aiQuestion = await fetchAiQuestion(updatedWrong);
          if (aiQuestion) {
            console.log("🚀 Injecting AI-generated question:", aiQuestion);
            // Replace the NEXT question with the AI one (keep total at 10)
            const nextIndex = currentIndex + 1;
            if (nextIndex < quiz.questions.length) {
              const updatedQuestions = [...quiz.questions];
              updatedQuestions[nextIndex] = aiQuestion;
              setQuiz({ ...quiz, questions: updatedQuestions });
            }
          }
        }
      }

      setRevealed(true);
      if (isLast) setIsLastRevealed(true);
      return;
    }

    // Second click (after reveal): advance or finish
    if (isLast) {
      const passed = score >= quiz!.minToPass;

      // Save attempt and wrong answers to progress
      const userId = getUserIdFromToken();
      if (userId && countryId) {
        try {
          await fetch("http://localhost:5000/api/ai/quiz-attempt", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              countryId,
              wrongAnswers,
            }),
          });
        } catch {
          // silent
        }
      }

      const success = await updateQuizProgress(score, passed);
      if (!success) console.error("Quiz passed, but progress update failed.");

      router.push(
        passed
          ? `/quiz/${countryName.toLowerCase()}/passed`
          : `/quiz/${countryName.toLowerCase()}/failed`,
      );
      return;
    }

    setCurrentIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  };

  const getOptionStyle = (option: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: "316px",
      height: "56px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "1.5px solid #111111",
      background: "white",
      cursor: revealed ? "default" : "pointer",
      fontFamily: "Helvetica, Arial, sans-serif",
      fontWeight: 400,
      fontSize: "18px",
      lineHeight: "106%",
      textAlign: "center",
      padding: "18px 87px",
      transition: "background 0.2s",
      whiteSpace: "nowrap",
      boxSizing: "border-box",
      color: "black",
    };

    if (!revealed) {
      if (selected === option) {
        return { ...base, background: "#999999", border: "2px solid #111" };
      }
      return base;
    }

    // Revealed state
    if (option === question.correctAnswer) {
      return { ...base, background: "#5FFF77", border: "2px solid #111" };
    }
    if (option === selected && option !== question.correctAnswer) {
      return { ...base, background: "#FF4646", border: "2px solid #111" };
    }
    return { ...base, background: "white" };
  };

  return (
    <>
      <style>{`
        .quiz-page {
          background-color: var(--blue-primary);
          max-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .quiz-inner {
          position: relative;
          max-width: 1440px;
          margin: 0 auto;
          padding-bottom: 80px;
        }

        /* Card stack */
        .card-container {
          position: relative;
          margin-top: 80px;
          margin-left: 90px;
          width: 1260px;
          // height: 766px;
          height: 600px;
          z-index: 1;
        }

        .card-bg {
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        /* Content sits on top of the card */
        .card-content {
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 2;
          padding: 40px 80px 100px;
          gap: 40px;
        }

        .question-text {
          font-family: var(--font-gafiton), sans-serif;
          font-weight: 400;
          font-size: 72px;
          line-height: 100%;
          letter-spacing: 0%;
          text-align: center;
          text-transform: capitalize;
          max-width: 900px;
        }

        /* 2×2 options grid */
        .options-grid {
          display: grid;
          grid-template-columns: 316px 316px;
          gap: 16px;
          justify-content: center;
        }

        /* Counter + Next row */
        .card-footer {
          position: absolute;
          bottom: 28px;
          left: 180px;
          right: 180px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 3;
        }

        .question-counter {
          font-family: Helvetica, Arial, sans-serif;
          font-weight: 400;
          font-size: 18px;
          color: black;
          line-height: 106%;
        }

        .next-btn {
          width: 100px;
          height: 32px;
          background: white;
          border: 1.5px solid #111;
          cursor: pointer;
          font-family: Helvetica, Arial, sans-serif;
          font-weight: 400;
          font-size: 18px;
          line-height: 106%;
          text-align: center;
          padding: 0;
          transition: all 0.15s;
          opacity: ${selected ? 1 : 0.4};
          color: black;
        }

        .next-btn:hover:not(:disabled) {
          transform: translate(-2px, -2px);
          box-shadow: 3px 3px 0px var(--yellow-primary);
        }

        .next-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Responsive */
        @media (max-width: 1400px) {
          .card-container { margin-left: 40px; width: calc(100vw - 80px); height: auto; }
          .question-text  { font-size: 48px; }
        }

        @media (max-width: 900px) {
          .card-container { margin-top: 80px; margin-left: 16px; width: calc(100vw - 32px); }
          .question-text  { font-size: 32px; }
          .options-grid   { grid-template-columns: 1fr 1fr; width: 90%; }
          .options-grid button { width: 100% !important; padding: 12px 16px !important; }
        }

        @media (max-width: 600px) {
          .question-text  { font-size: 24px; }
          .options-grid   { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="quiz-page">
        <Navbar />

        <div className="quiz-inner">
          <div className="card-container">
            {/* Card background image alternates */}
            <Image
              src={cardImage}
              alt="quiz card"
              width={1260}
              height={766}
              className="card-bg"
              priority
            />

            {/* Question + options */}
            <div className="card-content">
              <p className="question-text" style={{ color: questionColor }}>
                {question.question}
              </p>

              <div className="options-grid">
                {question.options.map((option, i) => (
                  <button
                    key={i}
                    style={getOptionStyle(option)}
                    onClick={() => handleSelect(option)}
                  >
                    {String.fromCharCode(65 + i)}: {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer: counter + next button */}
            <div className="card-footer">
              <span className="question-counter">
                {currentIndex + 1}/{total}
              </span>
              <button
                className="next-btn"
                onClick={handleNext}
                disabled={!selected}
              >
                {isLastRevealed ? "Done" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
