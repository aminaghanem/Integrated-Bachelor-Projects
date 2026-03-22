import { SignupData } from "./SignupWizard";
import { useState } from "react";

interface Props {
  data: SignupData;
  update: (data: Partial<SignupData['accessibility']>) => void;
  next: () => void;
  back: () => void;
  errors: any;
}

export default function Step4Accessibility({ data, update, next, back, errors }: Props) {

  const sensoryOptions = ["Visual impairment", "Hearing impairment"];
  const neuroOptions = ["ADHD", "Dyslexia", "Autism"];

  const [sensoryOther, setSensoryOther] = useState("");
  const [neuroOther, setNeuroOther] = useState("");

  const handleSensoryChange = (value: string, checked: boolean) => {
    const list = checked
      ? [...data.accessibility.sensory_limitations, value]
      : data.accessibility.sensory_limitations.filter(item => item !== value);

    update({ sensory_limitations: list });
    if (value === "Other" && !checked) {
      setSensoryOther("");
      update({ sensory_other: "" });
    }
  };

  const handleNeuroChange = (value: string, checked: boolean) => {
    const list = checked
      ? [...data.accessibility.neurodiversity_flags, value]
      : data.accessibility.neurodiversity_flags.filter(item => item !== value);

    update({ neurodiversity_flags: list });
    if (value === "Other" && !checked) {
      setNeuroOther("");
      update({ neuro_other: "" });
    }
  };

  return (
    <div className="card">

      <h2>Accessibility Needs</h2>

      <label style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>
        <input
          type="checkbox"
          checked={data.accessibility.has_accessibility_needs}
          onChange={(e) => update({ has_accessibility_needs: e.target.checked })}
        />
        I have accessibility needs
      </label>

      {data.accessibility.has_accessibility_needs && (
        <>

          <h3>Sensory Limitations</h3>

          <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"16px"}}>
            {sensoryOptions.map((s) => (
              <label key={s} style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <input
                  type="checkbox"
                  checked={data.accessibility.sensory_limitations.includes(s)}
                  onChange={(e) => handleSensoryChange(s, e.target.checked)}
                />
                {s}
              </label>
            ))}

            <label style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <input
                type="checkbox"
                checked={data.accessibility.sensory_limitations.includes("Other")}
                onChange={(e) => handleSensoryChange("Other", e.target.checked)}
              />
              Other
            </label>

            {data.accessibility.sensory_limitations.includes("Other") && (
              <input
                type="text"
                placeholder="Please specify"
                value={data.accessibility.sensory_other}
                onChange={(e) => {
                    update({ sensory_other: e.target.value })
                }}
                style={{
                  marginLeft:"24px",
                  padding:"8px",
                  borderRadius:"6px",
                  border:"1px solid #ccc",
                  maxWidth:"300px"
                }}
              />
            )}
          </div>


          <h3>Neurodiversity</h3>

          <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {neuroOptions.map((n) => (
              <label key={n} style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <input
                  type="checkbox"
                  checked={data.accessibility.neurodiversity_flags.includes(n)}
                  onChange={(e) => handleNeuroChange(n, e.target.checked)}
                />
                {n}
              </label>
            ))}

            <label style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <input
                type="checkbox"
                checked={data.accessibility.neurodiversity_flags.includes("Other")}
                onChange={(e) => handleNeuroChange("Other", e.target.checked)}
              />
              Other
            </label>

            {data.accessibility.neurodiversity_flags.includes("Other") && (
              <input
                type="text"
                placeholder="Please specify"
                value={data.accessibility.neuro_other}
                onChange={(e) => {
                  update({ neuro_other: e.target.value })
                }}
                style={{
                  marginLeft:"24px",
                  padding:"8px",
                  borderRadius:"6px",
                  border:"1px solid #ccc",
                  maxWidth:"300px"
                }}
              />
            )}

            {errors.accessibility && (
              <p className="error">{errors.accessibility}</p>
            )}

          </div>

        </>
      )}

      <div className="buttons">
        <button onClick={back}>Back</button>
        <button disabled={Object.keys(errors).length > 0} onClick={next}>Next</button>
      </div>

    </div>
  );
}