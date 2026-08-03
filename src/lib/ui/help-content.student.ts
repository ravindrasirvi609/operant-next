import type { HelpEntry } from "@/lib/ui/help";

export const studentHelpContent: Record<string, HelpEntry> = {
    "/student": {
        title: "Student Dashboard",
        purpose:
            "Your workspace home — a summary of your record counts, academic identity, and quick links into the rest of the student portal.",
        workflow: [
            "Check the summary cards for how many academic, achievement, engagement, and career-outcome records you have on file.",
            "Review the academic identity panel for your enrollment number, institution, department, program, and last login.",
            "Scan record coverage to see which categories (publications, research, sports, placements, etc.) are still thin.",
            "Use a quick route card to jump straight into that part of the workflow.",
        ],
        actions: [
            {
                label: "Records workspace",
                description: "Opens /student/records, the full records-entry workspace.",
            },
            {
                label: "Profile mapping",
                description: "Opens /student/profile to review or edit your profile.",
            },
            {
                label: "Continue academic updates",
                description: "Jumps to the Academics tab of the records workspace.",
            },
            {
                label: "Track achievements",
                description: "Jumps to the Publications tab to manage publications, research, awards, and skills.",
            },
            {
                label: "Manage outcomes",
                description: "Jumps to the Placements tab to review internships, placements, and evidence.",
            },
            {
                label: "Respond to SSR asks",
                description: "Opens /student/ssr, the assigned self-study report metrics and sections.",
            },
            {
                label: "Submit SSS survey",
                description: "Opens /student/sss to respond to the active Student Satisfaction Survey.",
            },
            {
                label: "Review profile mapping",
                description: "Opens /student/profile to check program, department, and institutional identity details.",
            },
        ],
        tips: [
            "The status badges next to your name reflect your student status and account status as set by the institution.",
            "\"Tracked records\" is the total count across every record category you have entered.",
            "Record coverage bars are a quick way to spot categories with zero entries before an accreditation review.",
        ],
    },
    "/student/profile": {
        title: "Student Profile",
        purpose:
            "Update your profile photo and basic personal details. Institutional identity — enrollment number, email, department, program, and admission year — is centrally managed and shown read-only.",
        workflow: [
            "Upload or replace your profile photo.",
            "Edit first name, last name, gender, date of birth, mobile number, and address.",
            "Click \"Save Basic Information\" to submit your changes.",
            "Scroll down to review the full read-only institutional record (academic mapping, personal details, and lifecycle notes).",
        ],
        actions: [
            {
                label: "Upload photo",
                description: "Replaces your profile photo (JPG, PNG, or WebP, up to 2 MB).",
            },
            {
                label: "Save Basic Information",
                description:
                    "Saves your first/last name, gender, date of birth, mobile number, and address to your profile.",
            },
        ],
        tips: [
            "Institution email, department, program, and enrollment mapping remain read-only — contact your institution to change these.",
            "Admission year is fixed and managed centrally alongside your academic mapping.",
            "Self-registration and self-approval aren't used here — your identity is provisioned by the institution and activated through first-time login setup.",
        ],
    },
    "/student/records": {
        title: "Student Records",
        purpose:
            "Your detailed evidence workspace for academic performance, achievements, engagement activities, and career outcomes — the source of truth behind your dashboard counts and accreditation reporting.",
        workflow: [
            "Choose a category tab: Academics, Publications, Research, Awards, Skills, Sports, Cultural, Events, Social, Placements, or Internships.",
            "Click \"Add\" to open the entry form for that category.",
            "Fill in the details — for Awards, Skills, Sports, Cultural, Events, and Social entries, pick from the institution's master-data list.",
            "Attach an evidence document where the category supports it.",
            "Click \"Save\" to create the record, or \"Cancel\" to discard the form.",
            "Use the delete (trash) icon on a row to remove a record you no longer want tracked.",
        ],
        actions: [
            { label: "Add", description: "Opens the entry form for the current tab's record type." },
            { label: "Save", description: "Submits the form and creates the new record." },
            { label: "Cancel", description: "Closes the open form without saving." },
            {
                label: "Upload evidence / Replace",
                description:
                    "Attaches or replaces the supporting document linked to a record, directly from its table row.",
            },
            { label: "Delete (trash icon)", description: "Removes the record immediately." },
            { label: "Open workspace home", description: "Returns to the /student dashboard." },
            { label: "Open student overview", description: "Opens /student/profile." },
        ],
        filters: [
            {
                label: "Category tabs",
                description:
                    "Academics, Publications, Research, Awards, Skills, Sports, Cultural, Events, Social, Placements, Internships — switching tabs updates the page URL's ?tab= parameter so you can link directly to one.",
            },
        ],
        tips: [
            "Academic records require picking a semester from your institution's configured list — if none appear, semesters haven't been set up yet for you.",
            "Award, Skill, Sport, Cultural, Event, and Social forms pull their options from admin-managed master data; an empty list means you'll need to ask an administrator to add the relevant master entries first.",
            "Evidence files accept PDF, JPG, PNG, or WebP and must be 10 MB or smaller.",
            "Placement records don't support evidence upload; Internship records do.",
            "The stat tiles at the top of the page (Total Records, Activities, etc.) update immediately after you add or delete a record.",
        ],
    },
    "/student/ssr": {
        title: "SSR Contributions",
        purpose:
            "Respond to the specific SSR criteria and metrics assigned to you, attach supporting evidence, and submit your answers into the institution's self-study report review workflow.",
        workflow: [
            "Select an assignment from the list on the left — each shows its status and metric code.",
            "Read the Contribution Guidance section for the metric description, instructions, and any section prompt or guidance.",
            "Fill in the response field for the metric's data type: narrative text, a number, plain text, a yes/no checkbox, a date, or structured JSON table data.",
            "Add supporting links (one URL per line) and upload supporting documents if requested.",
            "Add contributor remarks if you want to leave context for the reviewer.",
            "Click \"Save Draft\" to keep working later, or \"Submit Response\" once it's ready for review.",
        ],
        actions: [
            {
                label: "Save Draft",
                description: "Saves your current answer without submitting it for review.",
            },
            {
                label: "Submit Response",
                description: "Submits your response, moving it into the SSR review workflow.",
            },
        ],
        tips: [
            "You can only edit an assignment while it is Active, in Draft or Rejected status, and its accreditation cycle isn't Locked or Archived — otherwise the fields are disabled with a read-only notice.",
            "The response field shown changes automatically based on the metric's configured data type.",
            "Narrative responses may show a minimum and/or maximum word guidance when the assignment specifies one.",
            "If a reviewer rejects your response, it returns to Draft so you can revise and resubmit.",
        ],
    },
    "/student/sss": {
        title: "Student Satisfaction Survey",
        purpose:
            "Respond anonymously to the active Student Satisfaction Survey by rating each statement on its configured scale.",
        workflow: [
            "If more than one survey is assigned, pick the one you want to answer from the survey buttons.",
            "Rate each statement by clicking a number on its scale.",
            "Optionally add remarks under any statement.",
            "Click \"Submit SSS response\" once you've rated every statement.",
        ],
        actions: [
            { label: "Survey selector", description: "Switches between the surveys currently assigned to you." },
            {
                label: "Rating buttons",
                description: "Records your rating (1 up to the statement's scale maximum) for that statement.",
            },
            {
                label: "Submit SSS response",
                description: "Submits all of your ratings and remarks for the selected survey.",
            },
        ],
        tips: [
            "Your account is used only to check eligibility — the response itself is stored anonymously.",
            "Once you've submitted a survey it becomes read-only and instead shows that survey's live overall satisfaction index and institutional response rate.",
            "Each statement can have a different rating scale (for example 1-5), shown next to the question.",
        ],
    },
};
