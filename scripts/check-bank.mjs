import { categories, questions, sourceCatalog } from "../src/questions.js";

const errors = [];
const sourceIds = new Set(sourceCatalog.map(({ id }) => id));
const seenIds = new Set();

for (const question of questions) {
  if (seenIds.has(question.id)) errors.push(`Duplicate question ID: ${question.id}`);
  seenIds.add(question.id);

  if (!categories.includes(question.category)) {
    errors.push(`${question.id}: unknown category ${question.category}`);
  }
  if (!sourceIds.has(question.source)) {
    errors.push(`${question.id}: unknown source ${question.source}`);
  }
  if (!Array.isArray(question.options) || question.options.length !== 4) {
    errors.push(`${question.id}: expected exactly four options`);
  }
  if (!Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex > 3) {
    errors.push(`${question.id}: invalid answer index ${question.answerIndex}`);
  }
  if (new Set(question.options).size !== question.options.length) {
    errors.push(`${question.id}: duplicate answer options`);
  }
  if (!question.prompt || !question.explanation) {
    errors.push(`${question.id}: prompt or explanation is empty`);
  }
}

if (questions.length !== 334) errors.push(`Expected 334 questions, found ${questions.length}`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const counts = Object.fromEntries(
  categories.map((category) => [
    category,
    questions.filter((question) => question.category === category).length,
  ]),
);

console.log(JSON.stringify({ questions: questions.length, sources: sourceCatalog.length, counts }, null, 2));
