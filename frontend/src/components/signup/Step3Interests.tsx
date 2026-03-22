import { SignupData } from "./SignupWizard";
import { useState } from "react";

interface Props {
  data: SignupData;
  update: (data: Partial<SignupData>) => void;
  next: () => void;
  back: () => void;
  errors: any;
}

export default function Step3Interests({ data, update, next, back, errors }: Props) {

  const [newInterest, setNewInterest] = useState("");

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob)
    const today = new Date()

    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age
  }

  const age = calculateAge(data.date_of_birth)

  const young = ["Math", "English"];
  const older = ["Math", "English", "Science", "Programming", "History"];

  const baseCategories = age <= 10 ? young : older;

  // include dynamically added interests
  const customCategories = data.interest_scores
    .map(i => i.category)
    .filter(c => !baseCategories.includes(c));

  const categories = [...baseCategories, ...customCategories];

  const setRating = (category: string, score: number) => {

    const updated = [...data.interest_scores];

    const existing = updated.find(i => i.category === category);

    if (existing) {
      existing.score = score;
    } else {
      updated.push({ category, score });
    }

    update({ interest_scores: updated });
  };

  const getRating = (category: string) => {
    const item = data.interest_scores.find(i => i.category === category);
    return item ? item.score : 0;
  };

  const addInterest = () => {

    const value = newInterest.trim();

    if (!value) return;

    const exists = data.interest_scores.find(
      i => i.category.toLowerCase() === value.toLowerCase()
    );

    if (exists) {
      setNewInterest("");
      return;
    }

    const updated = [
      ...data.interest_scores,
      { category: value, score: 0 }
    ];

    update({ interest_scores: updated });

    setNewInterest("");
  };

  return (
    <div className="card">

      <h2>Rate Your Interests</h2>

      {categories.map((category) => (
        <div key={category} className="interest-row">

          <span className="interest-label">{category}</span>

          <div className="stars">
            {[1,2,3,4,5].map(star => (
              <span
                key={star}
                className={`star ${getRating(category) >= star ? "active" : ""}`}
                onClick={() => setRating(category, star)}
              >
                ★
              </span>
            ))}
          </div>

        </div>
      ))}

      {errors.interests && (
        <p className="error">{errors.interests}</p>
      )}

      <div className="add-interest">

        <input
          type="text"
          placeholder="Add another interest"
          value={newInterest}
          onChange={(e) => setNewInterest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addInterest();
            }
          }}
        />

        <button type="button" onClick={addInterest}>
          Add
        </button>

      </div>

      <div className="buttons">
        <button onClick={back}>Back</button>
        <button onClick={next}>Next</button>
      </div>

    </div>
  );
}
