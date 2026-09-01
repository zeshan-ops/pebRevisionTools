# Exam materials

Drop PEB-issued PDFs here for context: syllabi, past papers, examiners' reports,
regulations and candidate guidance.

| Folder | Contents |
|--------|----------|
| `syllabi/` | Official syllabus for each paper |
| `past-papers/` | Past exam question papers |
| `mark-schemes/` | Official mark schemes |
| `examiners-reports/` | Examiners' reports |
| `guidance/` | Programme specifications, regulations, candidate handbooks |

## Naming

`FC4-2026-syllabus.pdf`, `FC4-2022-paper.pdf`, `FC4-2022-mark-scheme.pdf`,
`FC4-2022-examiners-report.pdf` — paper code first, then year, then document
type. Keeps everything sortable and makes gaps obvious.

The extraction pipeline relies on this convention to pair a paper with its mark
scheme and examiner's report, so keep to it when adding papers.

## These files are not committed

`.gitignore` excludes the PDFs in this directory, because PEB material is their
copyright and this repo's visibility is unconfirmed. The folder structure and
this README are tracked; the contents are local only.

If the repo is private and you would rather have the PDFs sync across machines,
delete the `exam-materials/**/*.pdf` line from `.gitignore`.
