# NJ Driver Knowledge Practice

A static practice app for the New Jersey basic automobile knowledge test. The
bank contains 334 source-grounded questions, including 109 additions from a
September 2026 coverage audit.

## Sources

- NJ MVC Driver Manual, English, revised September 2026: https://www.nj.gov/mvc/about/manuals.htm
- NJ MVC Knowledge Test page: https://www.nj.gov/mvc/license/knowledgetest.htm
- NJ MVC Sample Knowledge Test: https://www.nj.gov/mvc/license/sample_knowledge_test.htm
- NJ MVC Road Test page: https://www.nj.gov/mvc/license/roadtest.htm
- NJ MVC Point Schedule: https://www.nj.gov/mvc/license/points-schedule.htm
- NJ Office of the Attorney General crosswalk-law summary: https://www.nj.gov/oag/hts/downloads/Crosswalk_Warning_Palm_Card.pdf
- Public practice-test topic cross-checks: https://www.dmv-written-test.com/new-jersey/practice-test-1.html and https://zutobi.com/us/nj-car/practice-permit-test

The question bank is paraphrased from official NJ MVC rules and cross-checked against common public practice-test topics.

## Run

```sh
npm run check
npm run dev
```

Open `http://localhost:4173` after starting the development server. The original
bank is in `src/questions.js`; the audited additions are kept separately in
`src/question-additions.js`.
