import { SignupData } from "./SignupWizard";

interface Props {
  data: SignupData;
  back: () => void;
  submit: () => void;
}

export default function Step5Review({ data, back, submit }: Props) {

  return (
    <div className="card">

      <h2>Review Information</h2>

      <p>Username: {data.username}</p>
      <p>Full Name: {data.full_name}</p>
      <p>Personal Email: {data.personal_email || "N/A"}</p>
      <p>Date of Birth: {data.date_of_birth}</p>
      <p>Grade Level: {data.grade_level}</p>
      <p>Parent Email: {data.parent_email}</p>
      <p>School Type: {data.school_type}</p>
      <p>Region: {data.region}</p>
      <p>Preferred Language: {data.preferred_language}</p>
      {/* <p>Interests: {data.interest_scores.join(", ")}</p> */}

      <div className="buttons">
        <button onClick={back}>Back</button>
        <button onClick={submit}>Submit</button>
      </div>

    </div>
  );
}