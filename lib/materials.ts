export type SourceSet = { id: string; title: string; prompt: string; aTitle: string; aBody: string; bTitle: string; bBody: string; isDemo: boolean };
export const demoMaterials: SourceSet = {
  id: "demo-learning-analytics", title: "Should universities use predictive learning analytics?",
  prompt: "Integrate evidence from both sources, develop a defensible position, and address relevant counterarguments.",
  aTitle: "Early-warning systems can enable timely student support",
  aBody: "Universities increasingly use learning analytics to identify patterns associated with academic difficulty. Attendance, assessment and learning-platform data may allow support teams to respond before a student disengages.\n\nAdvocates argue that early identification makes academic support more timely and better targeted, particularly in large programmes where individual difficulties may otherwise remain unnoticed.\n\nHowever, the educational value of prediction depends on how staff interpret the evidence and whether students can question or correct the data used to classify them.",
  bTitle: "Prediction requires attention to privacy and fairness",
  bBody: "Predictions based on incomplete behavioural data may misclassify students. A student's activity on a learning platform does not necessarily represent their understanding, circumstances, or effort.\n\nPrivacy and fairness therefore matter when universities use predictive learning analytics. Students should be able to understand how information about them is used and question decisions that affect their learning.\n\nThe value of these systems depends not only on predictive accuracy, but also on how institutions respond to uncertainty and preserve students' control over how they are represented.",
  isDemo: true,
};
