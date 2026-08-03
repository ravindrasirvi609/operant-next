import type { HelpEntry } from "@/lib/ui/help";

export const facultyHelpContent: Record<string, HelpEntry> = {
    "/faculty": {
        title: "Faculty Dashboard",
        purpose:
            "Your landing page after login: a snapshot of teaching load, research output, and the current status of every compliance submission (PBAS, CAS, AQAR).",
        workflow: [
            "Review the stat cards for teaching loads, research outputs, active projects, PBAS reports, CAS applications, and AQAR drafts.",
            "Check the Compliance Snapshot card for quick links into PBAS/CAS/AQAR readiness, faculty data completeness, the SSR contribution desk, the teaching-learning file, and the research and innovation desk.",
            "Resolve anything flagged in the Profile and Data Alerts card, then jump to the relevant module using the header action buttons.",
        ],
        actions: [
            { label: "Faculty Workspace", description: "Open your full faculty profile (identity, qualifications, teaching, research)." },
            { label: "PBAS", description: "Go to the PBAS applications dashboard." },
            { label: "SSR", description: "Open your SSR contribution workspace." },
            { label: "Teaching", description: "Open the Teaching & Learning contributor workspace." },
        ],
        tips: [
            "The Profile and Data Alerts card warns you when your employee code, highest qualification, teaching loads, or publications/research projects are missing — fill these in on your Profile page first.",
            "The stat cards and compliance links reflect the same data used by PBAS, CAS, and AQAR, so keeping your profile records current keeps this dashboard accurate too.",
        ],
    },

    "/faculty/profile": {
        title: "Faculty Profile",
        purpose:
            "Your academic dossier: identity, qualifications, teaching history, and every category of academic activity (publications, projects, patents, and more) that PBAS, CAS, AQAR, and SSR pull from.",
        workflow: [
            "Switch between the Profile, Teaching, Academic Activities, and Compliance tabs.",
            "Fill each section's fields — most sections use repeatable rows (add another publication, project, patent, and so on).",
            "Changes autosave a little over a second after you stop typing; watch the autosave indicator to confirm a save completed.",
            "Use the Download Excel / Download Template buttons inside a section to export or template that section, or use Export Dossier for a full multi-section download.",
        ],
        actions: [
            { label: "Export Dossier", description: "Open a dialog to download an Excel export of any combination of profile sections (qualifications, teaching summary, publications, books, patents, projects, awards, PhD guidance, and more)." },
            { label: "Download Excel", description: "Per-section button that exports just that section's current data." },
            { label: "Download Template", description: "Per-section button that downloads a blank import template for that section." },
        ],
        tips: [
            "This page is the single source of truth: PBAS, CAS, and AQAR read publications, projects, patents, and other records from here rather than duplicating entry.",
            "Edit links from PBAS/AQAR/CAS route back here with the exact section and record pre-selected, so you can fix a record without losing your place.",
            "Autosave only fires once a field is dirty, so an unsaved change is briefly at risk if you navigate away in under ~1.4 seconds — wait for the saved indicator.",
        ],
    },

    "/faculty/teaching-learning": {
        title: "Teaching & Learning Workspace",
        purpose:
            "Report against the teaching-and-learning plan assigned to you for an academic year — lesson delivery, assessments, and learner support, backed by narrative context.",
        workflow: [
            "Pick an assignment from the left-hand list (search by plan, unit, or status if you have several).",
            "Review the Teaching Load Context and Annual Teaching Summary for the assignment's targets.",
            "Fill the Narrative Sections textareas describing your approach.",
            "Add rows to the Lesson Delivery Register, Assessment Register, and Learner Support Register as you deliver sessions, run assessments, and support learners.",
            "Attach evidence and contributor remarks, then Save Draft or Submit for Review.",
        ],
        actions: [
            { label: "Add Session", description: "Add a row to the Lesson Delivery Register for a teaching session." },
            { label: "Add Assessment", description: "Add a row to the Assessment Register." },
            { label: "Add Support Action", description: "Add a row to the Learner Support Register." },
            { label: "Save Draft", description: "Save your current entries without submitting." },
            { label: "Submit for Review", description: "Send the assignment forward for review." },
        ],
        filters: [{ label: "Search by plan, unit, or status", description: "Filters the assignment list on the left." }],
        tips: [
            "You can only edit while the assignment status is Draft or Rejected; once submitted the form becomes read-only until it's sent back.",
        ],
    },

    "/faculty/curriculum": {
        title: "Curriculum Workspace",
        purpose:
            "Submit your syllabus draft and supporting evidence for the curriculum plan assigned to you for an academic year.",
        workflow: [
            "Select an assignment from the list (filter by academic year if needed).",
            "Complete the Syllabus Draft form fields for the assigned course/unit.",
            "Attach supporting evidence in the Evidence and Review Trail section.",
            "Save Draft to keep working, or Submit for Review when it's ready for the reviewer.",
        ],
        actions: [
            { label: "Save Draft", description: "Save the syllabus draft without submitting it." },
            { label: "Submit for Review", description: "Send the syllabus draft forward for review." },
        ],
        filters: [{ label: "Academic year", description: "Filters which curriculum assignments are shown." }],
        tips: [
            "Editing is only possible while the assignment is in Draft or Rejected status.",
            "The Evidence and Review Trail section keeps a record of every review decision made on this submission.",
        ],
    },

    "/faculty/research-innovation": {
        title: "Research & Innovation Workspace",
        purpose:
            "Report against your research-and-innovation plan: link existing publications/projects/patents as evidence, and log innovation activity, seed funding, and startup outcomes that aren't already tracked elsewhere.",
        workflow: [
            "Select an assignment from the list (search by plan, unit, or status).",
            "Review the plan targets (publications, projects, patents, consultancies, student research, innovation activities) for context.",
            "Fill the Narrative and Evidence textareas.",
            "In Linked Source Records, tick the checkbox next to any of your existing publications/projects/patents/etc. that should count as evidence for this plan.",
            "Add rows to Innovation Activities, Seed Funding and Innovation Grants, and Startups and Incubation Outcomes for anything not already covered by a linked source record.",
            "Save draft or Submit for review.",
        ],
        actions: [
            { label: "Save draft", description: "Save your current entries without submitting." },
            { label: "Submit for review", description: "Send the assignment forward for review." },
        ],
        filters: [{ label: "Search by plan, unit, or status", description: "Filters the assignment list on the left." }],
        tips: [
            "Linked Source Records reuses your profile data — add missing publications, projects, or patents on your Profile page rather than re-typing them here.",
            "Only add manual Innovation Activities / Grants / Startups rows for things not already represented by a linked source record, to avoid double counting.",
            "Editing is only possible while the assignment is in Draft or Rejected status.",
        ],
    },

    "/faculty/infrastructure-library": {
        title: "Infrastructure & Library Workspace",
        purpose:
            "Report facility, library, usage, and maintenance data for the infrastructure-and-library plan assigned to you.",
        workflow: [
            "Select an assignment from the list.",
            "Fill the Narrative and evidence section, including supporting links and any manual evidence documents.",
            "Add rows to the Facilities, Library Resources, Usage Analytics, and Maintenance Records registers as needed, attaching a document to each row where available.",
            "Check the Workflow history card for prior review activity.",
            "Save draft or Submit for review.",
        ],
        actions: [
            { label: "Add row", description: "Add a new row to a register (Facilities, Library Resources, Usage Analytics, or Maintenance Records)." },
            { label: "Save draft", description: "Save your current entries without submitting." },
            { label: "Submit for review", description: "Send the assignment forward for review." },
        ],
        tips: [
            "Each register keeps at least one row — removing the last row resets it to a blank row rather than leaving the register empty.",
            "Editing is only possible while the assignment is in Draft or Rejected status.",
        ],
    },

    "/faculty/student-support-governance": {
        title: "Student Support & Governance Workspace",
        purpose:
            "Report mentoring, grievance handling, student progression, and student-representation activity for the plan assigned to you.",
        workflow: [
            "Select an assignment from the list.",
            "Fill the Narrative and evidence section, including supporting links and any manual evidence documents.",
            "Add rows to the Mentor Groups, Grievances, Progression Tracking, and Student Representation registers as needed, attaching a document to each row where available.",
            "Check the Workflow history card for prior review activity.",
            "Save draft or Submit for review.",
        ],
        actions: [
            { label: "Add row", description: "Add a new row to a register (Mentor Groups, Grievances, Progression Tracking, or Student Representation)." },
            { label: "Save draft", description: "Save your current entries without submitting." },
            { label: "Submit for review", description: "Send the assignment forward for review." },
        ],
        tips: [
            "Each register keeps at least one row — removing the last row resets it to a blank row rather than leaving the register empty.",
            "Editing is only possible while the assignment is in Draft or Rejected status.",
        ],
    },

    "/faculty/pbas": {
        title: "PBAS Applications",
        purpose:
            "Manage your yearly Performance-Based Appraisal System submission: teaching, research, and institutional evidence roll up into an API score you review and submit for approval.",
        workflow: [
            "Start a PBAS draft for an academic year, or select an existing application from the list.",
            "Step 1 — Details: confirm the academic year, your (read-only) current designation, and the appraisal period.",
            "Step 2 — Teaching Sources: toggle which teaching-related records from your profile count as evidence.",
            "Step 3 — Research Sources: toggle which research-related records count as evidence.",
            "Step 4 — Institutional Sources: toggle which institutional-contribution records count as evidence.",
            "Step 5 — Score & Review: check the calculated API score and indicator totals, attach evidence to any indicator that needs it, then submit.",
            "Drafts autosave a little over a second after each change; only Draft and Rejected applications can be edited.",
        ],
        actions: [
            { label: "Start PBAS Draft", description: "Create a new PBAS application for an academic year." },
            { label: "Delete Draft", description: "Permanently remove a Draft application (not available once submitted)." },
            { label: "Download PBAS PDF", description: "Download the generated PDF report for the selected application." },
            { label: "Submit PBAS Application", description: "Submit the current application for approval." },
        ],
        tips: [
            "You can only start one PBAS draft per academic year — the dashboard blocks starting a second draft for a year that already has one.",
            "Submit is disabled while the application isn't editable, has no unsaved selection, or is missing required data — check the message under the Submit button for the exact reason.",
            "A Rejected application shows the reviewer's remarks in a banner; fix the flagged issue and resubmit rather than starting a new draft.",
            "Every indicator row in the Score & Review step can carry its own evidence upload — attach documents there rather than only relying on linked source records.",
            "Once an application leaves Draft/Rejected status, the workspace switches to a read-only Submission Summary view.",
        ],
    },

    "/faculty/aqar": {
        title: "AQAR Applications",
        purpose:
            "Build your annual AQAR (Annual Quality Assurance Report) contribution — research papers, projects, awards, patents, PhD outcomes, books, and outreach activity — for NAAC reporting.",
        workflow: [
            "Start an AQAR draft (or create a new one alongside existing drafts), or select an existing application from the list.",
            "Overview: pick the academic year and reporting period, then use Autofill selected year to pull matching publications, projects, awards, and other records from your profile.",
            "Research Papers, Seed Money Projects, Awards and Fellows, Patents and PhD, and Books and Outreach: add or edit the structured entries for each category, attaching proof documents where relevant.",
            "Review and Submit: check the section counts and contribution index, tick all three items on the submission checklist, then submit.",
            "Drafts autosave a little over a second after each change; only Draft and Rejected applications can be edited.",
        ],
        actions: [
            { label: "Start AQAR Draft / Create New AQAR Draft", description: "Create a new AQAR application for the selected year." },
            { label: "Autofill selected year", description: "Prefill sections from your faculty profile records for the chosen academic year." },
            { label: "Delete draft", description: "Remove a Draft or Rejected AQAR application (trash icon on its card)." },
            { label: "Download AQAR PDF", description: "Download the generated PDF report for the selected application." },
            { label: "Submit AQAR Application", description: "Submit the current application for review." },
        ],
        tips: [
            "Submit stays disabled until all three items on the review checklist are ticked — verifying dates/years/names, confirming evidence is ready, and confirming you've reviewed the summary counts.",
            "The Readiness Checks card flags any major section (research papers, projects, awards, patents/PhD, books/e-content, consultancy/FDP) that has zero records so you don't submit an incomplete report.",
            "Once a section is submitted the form becomes read-only until it's returned to Draft or Rejected.",
            "The reporting period fields auto-fill from the academic year you pick — adjust them manually only if your cycle differs from the standard June-to-May window.",
        ],
    },

    "/faculty/cas": {
        title: "CAS Applications",
        purpose:
            "Apply for Career Advancement Scheme promotion — eligibility is calculated from your approved PBAS history and service tenure, and the application walks you through an 8-step form.",
        workflow: [
            "Check the CAS Eligibility Snapshot for your current eligibility, required years/API score, and last approved PBAS score.",
            "Start a CAS draft, or select an existing application from the list.",
            "Basic Details: confirm application year, current designation, and the designation you're applying for.",
            "Eligibility Period: enter the from/to years and experience years being claimed.",
            "PBAS Reports: select which approved PBAS reports to link — this is the primary source for your API score.",
            "Publications (Optional) and Books & Projects (Optional): add only extra items not already covered by your linked PBAS reports.",
            "Academic Contributions: enter PhD guided / conference counts if applicable to your designation path.",
            "Documents & Checklist: upload mandatory and optional supporting documents.",
            "Review and Submit: check the summary, then submit.",
        ],
        actions: [
            { label: "Start CAS Draft", description: "Create a new CAS application." },
            { label: "Previous / Next", description: "Move between the 8 wizard steps." },
            { label: "Add Extra Publication / Add Extra Book / Add Extra Project", description: "Add a manual achievement row not already covered by a linked PBAS report." },
            { label: "Submit CAS Application", description: "Submit the current application for committee review." },
        ],
        tips: [
            "CAS scoring primarily reuses your linked PBAS data — only use the Publications/Books & Projects steps for achievements not already captured there.",
            "Submitting is blocked if any mandatory document in Documents & Checklist is missing; you'll see an error message rather than a disabled button.",
            "The application is editable only while its status is Draft or Rejected; a Rejected application shows a resubmission banner.",
            "Document Verification Status and the Committee Review Trail are read-only — they reflect decisions made by reviewers, not something you edit here.",
        ],
    },

    "/faculty/ssr": {
        title: "SSR Contribution Desk",
        purpose:
            "Respond to Self-Study Report (SSR) items assigned to you as part of the institution's accreditation cycle.",
        workflow: [
            "Select an assigned SSR item from the list.",
            "Read the Contribution Guidance card for what's expected in your response.",
            "Fill in the Response Entry card — the input type shown adapts to what the item expects (text, number, choice, etc.).",
            "Save Draft to keep working, or Submit for Review when ready.",
        ],
        actions: [
            { label: "Save Draft", description: "Save your response without submitting." },
            { label: "Submit for Review", description: "Send your response forward for review." },
        ],
        tips: [
            "You can only edit while your response status is Draft or Rejected, the assignment is still active, and the SSR cycle isn't Locked or Archived.",
            "If an item becomes uneditable, check whether the whole cycle has moved to Locked or Archived rather than assuming it's just your submission status.",
        ],
    },
};
