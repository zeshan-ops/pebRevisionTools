# Exam materials

Drop PEB-issued PDFs here for context: syllabi, past papers, examiners' reports,
regulations and candidate guidance.

| Folder | Contents |
|--------|----------|
| `syllabi/` | Official syllabus for each paper |
| `past-papers/` | Past exam papers |
| `examiners-reports/` | Examiners' reports and mark schemes |
| `guidance/` | Regulations, candidate handbooks, anything else the board issues |

## Naming

`FC4-2024-syllabus.pdf`, `FC4-2023-paper.pdf`, `FC4-2023-examiners-report.pdf` —
paper code first, then year, then document type. Keeps everything sortable and
makes it obvious what is missing.

## These files are not committed

`.gitignore` excludes the PDFs in this directory, because PEB material is their
copyright and this repo's visibility is unconfirmed. The folder structure and
this README are tracked; the contents are local only.

If the repo is private and you would rather have the PDFs sync across machines,
delete the `exam-materials/**/*.pdf` line from `.gitignore`.
