/** One-line note under a plan; only claims topic ordering when the student supplied topics. */
export function planExplanation(topicCount: number): string {
  if (topicCount === 0) {
    return "Generic template: no topics were given, so these are general revision tasks. Add topics for a plan built around your course.";
  }
  return "How this works: topics are spread evenly in the order you listed them, and the last day before the exam is kept for review. It doesn't know how hard each topic is or what your course covers.";
}
