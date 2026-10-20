/** One-line note under a syllabus plan; describes only what the builder does. */
export function syllabusExplanation(scopeEnd: number): string {
  return `How this works: sessions 1 to ${scopeEnd} from your syllabus, in order, with double time for sessions you marked shaky. The last two days are practice in your exam's format plus review, then a light review. It doesn't know what your professor will ask.`;
}

/** One-line note under a plan; only claims topic ordering when the student supplied topics. */
export function planExplanation(topicCount: number): string {
  if (topicCount === 0) {
    return "Generic template: no topics were given, so these are general revision tasks. Add topics for a plan built around your course.";
  }
  return "How this works: topics are spread evenly in the order you listed them, and the last day before the exam is kept for review. It doesn't know how hard each topic is or what your course covers.";
}
