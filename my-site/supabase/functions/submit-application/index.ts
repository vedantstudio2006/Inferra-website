// Public registration endpoint. Saves the application, then issues the QR pass
// and emails it. An email failure does NOT remove the application.
import { serviceClient, corsFor, reply, issueQrToken, sendQrEmail } from "../_shared/interview.ts";

const departments = [
  "Web & App Development",
  "AI & Machine Learning",
  "Cyber Security",
  "Outreach Cell",
  "Design & Media",
];
const years = ["First Year", "Second Year", "Third Year", "Final Year"];
const MAX_RESUME_SIZE = 5 * 1024 * 1024;

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (!cors.ok) return new Response("Origin not allowed", { status: 403 });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors.headers });
  if (req.method !== "POST") return reply({ success: false, error: "Method not allowed." }, 405, cors.headers);

  let resumePath: string | null = null;
  let admin: ReturnType<typeof serviceClient> | null = null;

  try {
    admin = serviceClient();
    const formData = await req.formData();

    // Honeypot: real students never fill this hidden field
    const website = formData.get("website");
    if (typeof website === "string" && website.trim()) {
      return reply({ success: false, error: "Invalid submission." }, 400, cors.headers);
    }

    const rawApplication = formData.get("application");
    if (typeof rawApplication !== "string") throw new Error("Application information is missing.");
    const application = JSON.parse(rawApplication);

    const first_name = String(application.first_name || "").trim();
    const last_name = String(application.last_name || "").trim();
    const email = String(application.email || "").trim().toLowerCase();
    const phone = String(application.phone || "").trim();
    const branch = String(application.branch || "").trim();
    const academic_year = String(application.academic_year || "").trim();
    const department = String(application.department || "").trim();
    const reason = String(application.reason || "").trim();
    const previous_experience = String(application.previous_experience || "").trim();
    const github = String(application.github || "").trim();
    const linkedin = String(application.linkedin || "").trim();
    const skills = Array.isArray(application.skills)
      ? application.skills.map((s: unknown) => String(s).trim()).filter(Boolean)
      : [];

    if (!first_name || !last_name || !email || !phone || !branch || !academic_year || !department || skills.length === 0) {
      throw new Error("Please fill all required fields.");
    }
    if (
      first_name.length > 80 || last_name.length > 80 || branch.length > 120 ||
      reason.length > 2000 || previous_experience.length > 2000 ||
      skills.length > 20 || skills.some((s: string) => s.length > 60)
    ) {
      throw new Error("One or more fields exceed the allowed length.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email address.");
    if (!/^[+0-9()\-\s]{7,20}$/.test(phone)) throw new Error("Please enter a valid phone number.");
    if (!years.includes(academic_year)) throw new Error("Invalid academic year.");
    if (!departments.includes(department)) throw new Error("Invalid department selection.");

    for (const [name, value] of [["GitHub", github], ["LinkedIn", linkedin]] as const) {
      if (value) {
        try {
          if (new URL(value).protocol !== "https:") throw new Error();
        } catch {
          throw new Error(`${name} must be a valid HTTPS URL.`);
        }
      }
    }

    // Optional resume: PDF only, max 5 MB, checked by file signature
    const resumeEntry = formData.get("resume");
    let resume: File | null = null;
    if (resumeEntry !== null) {
      if (!(resumeEntry instanceof File)) throw new Error("Invalid resume upload.");
      if (resumeEntry.size > 0) {
        if (resumeEntry.size > MAX_RESUME_SIZE) throw new Error("Resume must be smaller than 5 MB.");
        const head = new TextDecoder().decode(new Uint8Array(await resumeEntry.slice(0, 5).arrayBuffer()));
        if (head !== "%PDF-") throw new Error("Only valid PDF resumes are allowed.");
        resume = resumeEntry;
      }
    }

    const applicationId = crypto.randomUUID();

    if (resume) {
      const safeName = resume.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
      resumePath = `applications/${applicationId}/${safeName}`;
      const { error: uploadError } = await admin.storage.from("resumes").upload(
        resumePath, new Uint8Array(await resume.arrayBuffer()),
        { contentType: "application/pdf", upsert: false },
      );
      if (uploadError) throw new Error("Resume upload failed.");
    }

    const { data: saved, error: insertError } = await admin
      .from("applications")
      .insert({
        id: applicationId,
        user_id: null,
        first_name, last_name, email, phone, branch, academic_year, department,
        reason: reason || null,
        skills,
        previous_experience: previous_experience || null,
        github: github || null,
        linkedin: linkedin || null,
        resume_path: resumePath,
      })
      .select("id, first_name, email, department, status, created_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") throw new Error("An application with this email already exists.");
      console.error("Database insertion failed:", insertError.code);
      throw new Error("Could not save your application.");
    }

    // The application is saved. Now issue the QR pass and email it.
    // Any failure here is reported but does not undo the registration.
    let qrIssued = false;
    let emailSent = false;
    try {
      const token = await issueQrToken(admin, saved.id);
      qrIssued = true;
      emailSent = await sendQrEmail({
        to: saved.email,
        firstName: saved.first_name,
        applicationId: saved.id,
        department: saved.department,
        token,
      });
    } catch (qrError) {
      console.error("QR pass step failed for application", saved.id, qrError instanceof Error ? qrError.message : "unknown");
    }

    return reply({
      success: true,
      applicationId: saved.id,
      qrIssued,
      emailSent,
      message: emailSent
        ? "Application submitted. Your QR pass has been emailed to you."
        : "Application saved, but the email with your QR pass could not be sent. Our team will resend it.",
    }, 200, cors.headers);
  } catch (error) {
    if (resumePath && admin) {
      await admin.storage.from("resumes").remove([resumePath]);
    }
    console.error("Application submission error:", error instanceof Error ? error.message : "unknown");
    const message = error instanceof Error ? error.message : "Something went wrong.";
    const isValidation = [
      "Please fill", "Please enter", "Invalid ", "Only valid", "Resume ",
      "One or more", "An application", "Application information", "Your ", "GitHub", "LinkedIn",
    ].some((p) => message.startsWith(p));
    return reply({ success: false, error: message }, isValidation ? 400 : 500, cors.headers);
  }
});
