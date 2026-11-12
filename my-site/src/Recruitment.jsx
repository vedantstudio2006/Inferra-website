
import { useState } from "react";
import PageShell from "./PageShell";
import { supabase } from "./lib/supabase";
import "./Recruitment.css";

const departments = [
  "Web & App Development",
  "AI & Machine Learning",
  "Cyber Security",
  "Outreach Cell",
  "Design & Media",
];

const years = [
  "First Year",
  "Second Year",
  "Third Year",
  "Final Year",
];

export default function Recruitment() {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    const formElement = e.currentTarget;
    const values = new FormData(formElement);

    setStatus("sending");
    setMessage("");

    try {
      // Convert comma-separated skills into an array
      const skills = String(values.get("skills") || "")
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);

      // Prepare student application
      const application = {
        first_name: String(values.get("first_name") || "").trim(),
        last_name: String(values.get("last_name") || "").trim(),
        email: String(values.get("email") || "").trim(),
        phone: String(values.get("phone") || "").trim(),
        branch: String(values.get("branch") || "").trim(),
        academic_year: String(
          values.get("academic_year") || ""
        ),
        department: String(values.get("department") || ""),
        reason: String(values.get("reason") || "").trim(),
        skills,
        previous_experience: String(
          values.get("previous_experience") || ""
        ).trim(),
        github: String(values.get("github") || "").trim(),
        linkedin: String(values.get("linkedin") || "").trim(),
      };

      // Create multipart request for optional resume
      const requestBody = new FormData();

      requestBody.append(
        "application",
        JSON.stringify(application)
      );

      const resume = values.get("resume");

      if (resume instanceof File && resume.name) {
        requestBody.append("resume", resume);
      }

      // Submit application to Supabase Edge Function
      const { data, error } = await supabase.functions.invoke(
        "submit-application",
        {
          body: requestBody,
        }
      );

      if (error) {
        let errorMessage = error.message;

        // Read the backend's error message, when available
        if (error.context instanceof Response) {
          const details = await error.context
            .clone()
            .json()
            .catch(() => null);

          if (details?.error) {
            errorMessage = details.error;
          }
        }

        throw new Error(errorMessage);
      }

      if (!data || !data.success) {
        throw new Error(
          data?.error || "Application submission failed."
        );
      }

      setApplicationId(data.applicationId);
      setEmailSent(Boolean(data.emailSent));
      setStatus("success");

    } catch (error) {
      console.error("Recruitment submission error:", error);

      setMessage(
        error.message || "Something went wrong. Please try again."
      );

      setStatus("error");

    }
  }

  return (
    <PageShell>
      <div className="pg__split">

        <div>
          <h1 className="pg__title">
            Recruitment
          </h1>

          <p className="pg__lead">
            Join Inferra Labs. Fill in the form and we
            will contact you by email about the next steps.
          </p>
        </div>

        {status === "success" ? (

          <div className="rec__done">
            <h2>You're registered!</h2>

            <p>
              Thank you for applying to Inferra Labs.
              Your application has been successfully received.
            </p>

            <p>
              <strong>Application ID:</strong>
              <br />
              {applicationId}
            </p>

            {emailSent ? (
              <p>
                A confirmation email has been sent to your
                personal email address.
              </p>
            ) : (
              <p>
                Your application is saved, but we could not
                send the confirmation email. Please contact
                the recruitment team.
              </p>
            )}
          </div>

        ) : (

          <form
            className="rec__form"
            onSubmit={handleSubmit}
          >

            <h2 className="rec__section">
              Personal Information
            </h2>

            <div className="rec__field">
              <label htmlFor="first_name">
                First name
              </label>

              <input
                id="first_name"
                name="first_name"
                type="text"
                maxLength="80"
                autoComplete="given-name"
                required
              />
            </div>

            <div className="rec__field">
              <label htmlFor="last_name">
                Last name
              </label>

              <input
                id="last_name"
                name="last_name"
                type="text"
                maxLength="80"
                autoComplete="family-name"
                required
              />
            </div>

            <div className="rec__field">
              <label htmlFor="email">
                Personal email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>

            <div className="rec__field">
              <label htmlFor="phone">
                Phone number
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength="20"
                required
              />
            </div>

            <div className="rec__field">
              <label htmlFor="branch">
                Branch / Course
              </label>

              <input
                id="branch"
                name="branch"
                type="text"
                placeholder="Computer Engineering"
                maxLength="120"
                required
              />
            </div>

            <div className="rec__field">
              <label htmlFor="academic_year">
                Current academic year
              </label>

              <select
                id="academic_year"
                name="academic_year"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select year
                </option>

                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <h2 className="rec__section">
              Club Preferences
            </h2>

            <div className="rec__field rec__field--full">
              <label htmlFor="department">
                Department you want to join
              </label>

              <select
                id="department"
                name="department"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select department
                </option>

                {departments.map((department) => (
                  <option
                    key={department}
                    value={department}
                  >
                    {department}
                  </option>
                ))}
              </select>
            </div>

            <div className="rec__field rec__field--full">
              <label htmlFor="reason">
                Why do you want to join? (Optional)
              </label>

              <textarea
                id="reason"
                name="reason"
                rows="3"
                maxLength="2000"
              />
            </div>

            <h2 className="rec__section">
              Skills & Experience
            </h2>

            <div className="rec__field rec__field--full">
              <label htmlFor="skills">
                Your skills
              </label>

              <input
                id="skills"
                name="skills"
                type="text"
                placeholder="Python, React, Linux, Figma"
                required
              />

              <small>
                Separate multiple skills using commas.
              </small>
            </div>

            <div className="rec__field rec__field--full">
              <label htmlFor="previous_experience">
                Previous experience (Optional)
              </label>

              <textarea
                id="previous_experience"
                name="previous_experience"
                rows="3"
                maxLength="2000"
              />
            </div>

            <div className="rec__field">
              <label htmlFor="github">
                GitHub (Optional)
              </label>

              <input
                id="github"
                name="github"
                type="url"
                placeholder="https://github.com/username"
              />
            </div>

            <div className="rec__field">
              <label htmlFor="linkedin">
                LinkedIn (Optional)
              </label>

              <input
                id="linkedin"
                name="linkedin"
                type="url"
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div className="rec__field rec__field--full">
              <label htmlFor="resume">
                Resume (PDF, optional, max 5 MB)
              </label>

              <input
                id="resume"
                name="resume"
                type="file"
                accept=".pdf,application/pdf"
              />
            </div>

            <button
              className="rec__submit"
              type="submit"
              disabled={status === "sending"}
            >
              {status === "sending"
                ? "Submitting..."
                : "Register"}
            </button>

            {status === "error" && (
              <p className="rec__error" role="alert">
                {message}
              </p>
            )}

          </form>

        )}

      </div>
    </PageShell>
  );
}
