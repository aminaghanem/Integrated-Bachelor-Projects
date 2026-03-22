import { SignupData } from "./SignupWizard";

interface Props {
  data: SignupData;
  update: (data: Partial<SignupData>) => void;
  next: () => void;
  back: () => void;
  errors: Record<string, string>;
}

export default function Step2Profile({ data, update, next, back, errors }: Props) {

  return (
    <div className="card">

      <h2>Student Profile</h2>

      <div className="form-group">
        <label>Full Name</label>
        <input
          type="text"
          value={data.full_name}
          onChange={(e) => update({ full_name: e.target.value })}
          required
        />
        {errors.full_name && (
          <p className="error">{errors.full_name}</p>
        )}
      </div>

      <div className="form-group">
        <label>Date of Birth</label>
        <input
          type="date"
          value={data.date_of_birth}
          onChange={(e) => update({ date_of_birth: e.target.value })}
          required
        />
        {errors.date_of_birth && (
          <p className="error">{errors.date_of_birth}</p>
        )}
      </div>

      <div className="form-group">
        <label>Parent Email</label>
        <input
          type="email"
          value={data.parent_email}
          onChange={(e) => update({ parent_email: e.target.value })}
          required
        />
        {errors.parent_email && (
          <p className="error">{errors.parent_email}</p>
        )}
      </div>

      <div className="form-group">
        <label>Personal Email (Optional)</label>
        <input
          type="email"
          value={data.personal_email}
          onChange={(e) => update({ personal_email: e.target.value })}
        />
        {errors.personal_email && (
          <p className="error">{errors.personal_email}</p>
        )}
      </div>

      {/* <div className="form-group">
        <label>School Name</label>
        <input
          type="text"
          value={data.school_name}
          onChange={(e) => update({ school_name: e.target.value })}
        />
        {errors.school_name && (
          <p className="error">{errors.school_name}</p>
        )}
      </div>

      <div className="form-group">
        <label>School Class</label>
        <input
          type="text"
          value={data.school_class}
          onChange={(e) => update({ school_class: e.target.value })}
        />
        {errors.school_class && (
          <p className="error">{errors.school_class}</p>
        )}
      </div> */}

      <div className="form-group">
        <label>Grade Level</label>
        <input
          type="number"
          value={data.grade_level}
          onChange={(e) => update({ grade_level: e.target.value })}
          required
        />
        {errors.grade_level && (
          <p className="error">{errors.grade_level}</p>
        )}
      </div>

      <div className="form-group">
        <label>School Type</label>
        <select
          value={data.school_type}
          onChange={(e) => update({ school_type: e.target.value })}
          required
        >
          <option value="" disabled>
            Select School Type
          </option>
          <option value="public">Public</option>
          <option value="private">Private</option>
          <option value="international">International</option>
          <option value="homeschooled">Homeschool</option>
        </select>
        {errors.school_type && (
          <p className="error">{errors.school_type}</p>
        )}
      </div>

      <div className="form-group">
        <label>Region</label>
        <select
          value={data.region}
          onChange={(e) => update({ region: e.target.value })}
          required
        >
          <option value="" disabled>
            Select Region
          </option>
          <option value="Africa">Africa</option>
          <option value="Middle East">Middle East</option>
          <option value="Europe">Europe</option>
          <option value="Asia">Asia</option>
          <option value="North America">North America</option>
        </select>
        {errors.region && (
          <p className="error">{errors.region}</p>
        )}
      </div>

      <div className="form-group">
        <label>Preferred Language</label>
        <select
          value={data.preferred_language}
          onChange={(e) => update({ preferred_language: e.target.value })}
          required
        >
          <option value="" disabled>
            Select Language
          </option>
          <option value="Arabic">Arabic</option>
          <option value="English">English</option>
          <option value="French">French</option>
          <option value="German">German</option>
        </select>
        {errors.preferred_language && (
          <p className="error">{errors.preferred_language}</p>
        )}
      </div>

      <div className="form-group">
        <label>Learning Preference</label>
        <select
          value={data.learning_preferences}
          onChange={(e) =>
            update({ learning_preferences: e.target.value })
          }
          required
        >
          <option value="" disabled>
            Select Learning Preference
          </option>
          <option value="Visual">Visual</option>
          <option value="Auditory">Auditory</option>
          <option value="Reading/Writing">Reading/Writing</option>
          <option value="Kinesthetic">Kinesthetic</option>
        </select>
        {errors.learning_preferences && (
          <p className="error">{errors.learning_preferences}</p>
        )}
      </div>

      <div className="buttons">
        <button onClick={back}>Back</button>
        <button disabled={Object.keys(errors).length > 0} onClick={next}>Next</button>
      </div>

    </div>
  );
}